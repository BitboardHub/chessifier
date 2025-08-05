mod encoding;
mod models;
mod ops;
mod schema;
mod search;
mod core;
mod pgn;

use crate::{
    db::{
        encoding::{decode_move},
        models::*,
        ops::*,
        schema::*,
    },
    error::{Error, Result},
    opening::get_opening_from_setup,
    AppState,
};
use chrono::{NaiveDate};
use dashmap::DashMap;
use diesel::{
    connection::{DefaultLoadingMode, SimpleConnection},
    insert_into,
    prelude::*,
    r2d2::{ConnectionManager, Pool},
    sql_query,
    sql_types::Text,
};
use pgn_reader::{BufferedReader};
use pgn::{GameTree, Importer, TempGame};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use shakmaty::{
    fen::Fen, Board, Chess, EnPassantMode, Piece, Position, FromSetup, CastlingMode
};
use specta::Type;
use std::{
    fs::{remove_file, File, OpenOptions},
    path::PathBuf,
    sync::atomic::{AtomicUsize, Ordering},
    time::{Duration, Instant},
};
use std::io::{BufWriter, Write};
use tauri::{path::BaseDirectory, Manager};
use tauri::{Emitter, State};

use log::info;
use tauri_specta::Event as _;

pub use self::models::NormalizedGame;
pub use self::models::Puzzle;
pub use self::schema::puzzles;
pub use self::search::{
    is_position_in_db, search_position, PositionQuery, PositionQueryJs, PositionStats,
};

const INDEXES_SQL: &str = include_str!("indexes.sql");

const DELETE_INDEXES_SQL: &str = include_str!("delete_indexes.sql");

const WHITE_PAWN: Piece = Piece {
    color: shakmaty::Color::White,
    role: shakmaty::Role::Pawn,
};

const BLACK_PAWN: Piece = Piece {
    color: shakmaty::Color::Black,
    role: shakmaty::Role::Pawn,
};

/// Returns the bit representation of the pawns on the second and seventh rank
/// of the given board.
fn get_pawn_home(board: &Board) -> u16 {
    let white_pawns = board.by_piece(WHITE_PAWN);
    let black_pawns = board.by_piece(BLACK_PAWN);
    let second_rank_pawns = (white_pawns.0 >> 8) as u8;
    let seventh_rank_pawns = (black_pawns.0 >> 48) as u8;
    (second_rank_pawns as u16) | ((seventh_rank_pawns as u16) << 8)
}

#[derive(Debug)]
pub enum JournalMode {
    Delete,
    Off,
}

#[derive(Debug)]
pub struct ConnectionOptions {
    pub journal_mode: JournalMode,
    pub enable_foreign_keys: bool,
    pub busy_timeout: Option<Duration>,
}

impl Default for ConnectionOptions {
    fn default() -> Self {
        Self {
            journal_mode: JournalMode::Delete,
            enable_foreign_keys: true,
            busy_timeout: Some(Duration::from_secs(30)),
        }
    }
}

impl diesel::r2d2::CustomizeConnection<SqliteConnection, diesel::r2d2::Error>
    for ConnectionOptions
{
    fn on_acquire(&self, conn: &mut SqliteConnection) -> std::result::Result<(), diesel::r2d2::Error> {
        (|| {
            match self.journal_mode {
                JournalMode::Delete => conn.batch_execute("PRAGMA journal_mode = DELETE;")?,
                JournalMode::Off => conn.batch_execute("PRAGMA journal_mode = OFF;")?,
            }
            if self.enable_foreign_keys {
                conn.batch_execute("PRAGMA foreign_keys = ON;")?;
            }
            if let Some(d) = self.busy_timeout {
                conn.batch_execute(&format!("PRAGMA busy_timeout = {};", d.as_millis()))?;
            }
            Ok(())
        })()
        .map_err(diesel::r2d2::Error::QueryError)
    }
}

fn get_db_or_create(
    state: &State<AppState>,
    db_path: &str,
    options: ConnectionOptions,
) -> Result<diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<diesel::SqliteConnection>>> {
    let pool = match state.connection_pool.get(db_path) {
        Some(pool) => pool.clone(),
        None => {
            let pool = Pool::builder()
                .max_size(16)
                .connection_customizer(Box::new(options))
                .build(ConnectionManager::<SqliteConnection>::new(db_path))?;
            state
                .connection_pool
                .insert(db_path.to_string(), pool.clone());
            pool
        }
    };

    Ok(pool.get()?)
}

#[derive(Debug)]
pub struct MaterialColor {
    white: u8,
    black: u8,
}

impl Default for MaterialColor {
    fn default() -> Self {
        Self {
            white: 39,
            black: 39,
        }
    }
}

#[derive(Default, Debug, Serialize)]
pub struct TempPlayer {
    id: usize,
    name: Option<String>,
    rating: Option<i32>,
}

pub fn insert_to_db(db: &mut SqliteConnection, game: &TempGame) -> Result<()> {
    let pawn_home = get_pawn_home(game.position.board());

    let white_id = if let Some(name) = &game.white_name {
        create_player(db, name)?.id
    } else {
        0
    };

    let black_id = if let Some(name) = &game.black_name {
        create_player(db, name)?.id
    } else {
        0
    };

    let event_id = if let Some(name) = &game.event_name {
        create_event(db, name)?.id
    } else {
        0
    };

    let site_id = if let Some(name) = &game.site_name {
        create_site(db, name)?.id
    } else {
        0
    };

    let ply_count = (game.moves.len()) as i32;
    let final_material = pgn::get_material_count(game.position.board());
    let minimal_white_material = game.material_count.white.min(final_material.white) as i32;
    let minimal_black_material = game.material_count.black.min(final_material.black) as i32;

    let new_game = NewGame {
        white_id,
        black_id,
        ply_count,
        eco: game.eco.as_deref(),
        round: game.round.as_deref(),
        white_elo: game.white_elo,
        black_elo: game.black_elo,
        white_material: minimal_white_material,
        black_material: minimal_black_material,
        // max_rating: game.game.white.rating.max(game.game.black.rating),
        date: game.date.as_deref(),
        time: game.time.as_deref(),
        time_control: game.time_control.as_deref(),
        site_id,
        event_id,
        fen: game.fen.as_deref(),
        result: game.result.as_deref(),
        moves: game.moves.as_slice(),
        pawn_home: pawn_home as i32,
    };

    core::add_game(db, new_game)?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn convert_pgn(
    file: PathBuf,
    db_path: PathBuf,
    timestamp: Option<i32>,
    app: tauri::AppHandle,
    title: String,
    description: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<()> {
    let description = description.unwrap_or_default();
    let extension = file.extension();

    let db_exists = db_path.exists();

    // create the database file
    let db = &mut get_db_or_create(
        &state,
        db_path.to_str().unwrap(),
        ConnectionOptions {
            enable_foreign_keys: false,
            busy_timeout: None,
            journal_mode: JournalMode::Off,
        },
    )?;

    if !db_exists {
        core::init_db(db, &title, &description)?;
    }

    let file = File::open(&file)?;

    let uncompressed: Box<dyn std::io::Read + Send> = if extension == Some("bz2".as_ref()) {
        Box::new(bzip2::read::MultiBzDecoder::new(file))
    } else if extension == Some("zst".as_ref()) {
        Box::new(zstd::Decoder::new(file)?)
    } else {
        Box::new(file)
    };

    // start counting time
    let start = Instant::now();

    let mut importer = Importer::new(timestamp.map(|t| t as i64));
    db.transaction::<_, Error, _>(|db| {
        for (i, game) in BufferedReader::new(uncompressed)
            .into_iter(&mut importer)
            .flatten()
            .flatten()
            .enumerate()
        {
            if i % 1000 == 0 {
                let elapsed = start.elapsed().as_millis() as u32;
                app.emit("convert_progress", (i, elapsed)).unwrap();
            }
            insert_to_db(db, &game)?;
        }
        Ok(())
    })?;

    if !db_exists {
        // Create all the necessary indexes
        db.batch_execute(INDEXES_SQL)?;
    }

    // get game, player, event and site counts and to the info table
    let game_count: i64 = games::table.count().get_result(db)?;
    let player_count: i64 = players::table.count().get_result(db)?;
    let event_count: i64 = events::table.count().get_result(db)?;
    let site_count: i64 = sites::table.count().get_result(db)?;

    let counts = [
        ("GameCount", game_count),
        ("PlayerCount", player_count),
        ("EventCount", event_count),
        ("SiteCount", site_count),
    ];

    for c in counts.iter() {
        insert_into(info::table)
            .values((info::name.eq(c.0), info::value.eq(c.1.to_string())))
            .on_conflict(info::name)
            .do_update()
            .set(info::value.eq(c.1.to_string()))
            .execute(db)?;
    }

    Ok(())
}

#[derive(Serialize, Type)]
pub struct DatabaseInfo {
    title: String,
    description: String,
    player_count: i32,
    event_count: i32,
    game_count: i32,
    storage_size: i32,
    filename: String,
    indexed: bool,
}

#[derive(QueryableByName, Debug, Serialize)]
struct IndexInfo {
    #[diesel(sql_type = Text, column_name = "name")]
    _name: String,
}

fn check_index_exists(conn: &mut SqliteConnection) -> Result<bool> {
    let query = sql_query("SELECT name FROM pragma_index_list('Games');");
    let indexes: Vec<IndexInfo> = query.load(conn)?;
    Ok(!indexes.is_empty())
}

#[tauri::command]
#[specta::specta]
pub async fn get_db_info(
    file: PathBuf,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<DatabaseInfo> {
    let db_path = PathBuf::from("db").join(file);

    info!("get_db_info {:?}", db_path);

    let path = app.path().resolve(db_path, BaseDirectory::AppData)?;

    let db = &mut get_db_or_create(&state, path.to_str().unwrap(), ConnectionOptions::default())?;

    let player_count = players::table.count().get_result::<i64>(db)? as i32;
    let game_count = games::table.count().get_result::<i64>(db)? as i32;
    let event_count = events::table.count().get_result::<i64>(db)? as i32;

    let title = match info::table
        .filter(info::name.eq("Title"))
        .first(db)
        .map(|title_info: Info| title_info.value)
    {
        Ok(Some(title)) => title,
        _ => "Untitled".to_string(),
    };

    let description = match info::table
        .filter(info::name.eq("Description"))
        .first(db)
        .map(|description_info: Info| description_info.value)
    {
        Ok(Some(description)) => description,
        _ => "".to_string(),
    };

    let storage_size = path.metadata()?.len() as i32;
    let filename = path.file_name().expect("get filename").to_string_lossy();

    let is_indexed = check_index_exists(db)?;
    Ok(DatabaseInfo {
        title,
        description,
        player_count,
        game_count,
        event_count,
        storage_size,
        filename: filename.to_string(),
        indexed: is_indexed,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn create_indexes(file: PathBuf, state: tauri::State<'_, AppState>) -> Result<()> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;

    db.batch_execute(INDEXES_SQL)?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_indexes(file: PathBuf, state: tauri::State<'_, AppState>) -> Result<()> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;

    db.batch_execute(DELETE_INDEXES_SQL)?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn edit_db_info(
    file: PathBuf,
    title: Option<String>,
    description: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<()> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;

    if let Some(title) = title {
        diesel::insert_into(info::table)
            .values((info::name.eq("Title"), info::value.eq(title.clone())))
            .on_conflict(info::name)
            .do_update()
            .set(info::value.eq(title))
            .execute(db)?;
    }

    if let Some(description) = description {
        diesel::insert_into(info::table)
            .values((
                info::name.eq("Description"),
                info::value.eq(description.clone()),
            ))
            .on_conflict(info::name)
            .do_update()
            .set(info::value.eq(description))
            .execute(db)?;
    }

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, Type)]
pub enum Sides {
    BlackWhite,
    WhiteBlack,
    Any,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, Type)]
pub enum GameSort {
    #[default]
    #[serde(rename = "id")]
    Id,
    #[serde(rename = "date")]
    Date,
    #[serde(rename = "whiteElo")]
    WhiteElo,
    #[serde(rename = "blackElo")]
    BlackElo,
    #[serde(rename = "ply_count")]
    PlyCount,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, Type)]
pub enum SortDirection {
    #[serde(rename = "asc")]
    Asc,
    #[default]
    #[serde(rename = "desc")]
    Desc,
}

#[derive(Default, Debug, Clone, Deserialize, PartialEq, Eq, Hash, Type)]
#[serde(rename_all = "camelCase")]
pub struct QueryOptions<SortT> {
    pub skip_count: bool,
    #[specta(optional)]
    pub page: Option<i32>,
    #[specta(optional)]
    pub page_size: Option<i32>,
    pub sort: SortT,
    pub direction: SortDirection,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Hash)]
pub struct GameQuery {
    pub options: Option<QueryOptions<GameSort>>,
    pub player1: Option<i32>,
    pub player2: Option<i32>,
    pub tournament_id: Option<i32>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub range1: Option<(i32, i32)>,
    pub range2: Option<(i32, i32)>,
    pub sides: Option<Sides>,
    pub outcome: Option<String>,
    pub position: Option<PositionQuery>,
}

#[derive(Debug, Clone, Default, Deserialize, PartialEq, Eq, Hash, Type)]
pub struct GameQueryJs {
    #[specta(optional)]
    pub options: Option<QueryOptions<GameSort>>,
    #[specta(optional)]
    pub player1: Option<i32>,
    #[specta(optional)]
    pub player2: Option<i32>,
    #[specta(optional)]
    pub tournament_id: Option<i32>,
    #[specta(optional)]
    pub start_date: Option<String>,
    #[specta(optional)]
    pub end_date: Option<String>,
    #[specta(optional)]
    pub range1: Option<(i32, i32)>,
    #[specta(optional)]
    pub range2: Option<(i32, i32)>,
    #[specta(optional)]
    pub sides: Option<Sides>,
    #[specta(optional)]
    pub outcome: Option<String>,
    #[specta(optional)]
    pub position: Option<PositionQueryJs>,
    #[specta(optional)]
    pub wanted_result: Option<String>,
}

impl GameQueryJs {
    pub fn new() -> Self {
        Self::default()
    }
    pub fn position(mut self, position: PositionQueryJs) -> Self {
        self.position = Some(position);
        self
    }
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct QueryResponse<T> {
    pub data: T,
    pub count: Option<i32>,
}

#[tauri::command]
#[specta::specta]
pub async fn get_games(
    file: PathBuf,
    query: GameQueryJs,
    state: tauri::State<'_, AppState>,
) -> Result<QueryResponse<Vec<NormalizedGame>>> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;

    let mut count: Option<i64> = None;
    let query_options = query.options.unwrap_or_default();

    let (white_players, black_players) = diesel::alias!(players as white, players as black);
    let mut sql_query = games::table
        .inner_join(white_players.on(games::white_id.eq(white_players.field(players::id))))
        .inner_join(black_players.on(games::black_id.eq(black_players.field(players::id))))
        .inner_join(events::table.on(games::event_id.eq(events::id)))
        .inner_join(sites::table.on(games::site_id.eq(sites::id)))
        .into_boxed();
    let mut count_query = games::table.into_boxed();

    // if let Some(speed) = query.speed {
    //     sql_query = sql_query.filter(games::speed.eq(speed as i32));
    //     count_query = count_query.filter(games::speed.eq(speed as i32));
    // }

    if let Some(outcome) = query.outcome {
        sql_query = sql_query.filter(games::result.eq(outcome.clone()));
        count_query = count_query.filter(games::result.eq(outcome));
    }

    if let Some(start_date) = query.start_date {
        sql_query = sql_query.filter(games::date.ge(start_date.clone()));
        count_query = count_query.filter(games::date.ge(start_date));
    }

    if let Some(end_date) = query.end_date {
        sql_query = sql_query.filter(games::date.le(end_date.clone()));
        count_query = count_query.filter(games::date.le(end_date));
    }

    if let Some(tournament_id) = query.tournament_id {
        sql_query = sql_query.filter(games::event_id.eq(tournament_id));
        count_query = count_query.filter(games::event_id.eq(tournament_id));
    }

    if let Some(limit) = query_options.page_size {
        sql_query = sql_query.limit(limit as i64);
    }

    if let Some(page) = query_options.page {
        sql_query = sql_query.offset(((page - 1) * query_options.page_size.unwrap_or(10)) as i64);
    }

    match query.sides {
        Some(Sides::BlackWhite) => {
            if let Some(player1) = query.player1 {
                sql_query = sql_query.filter(games::black_id.eq(player1));
                count_query = count_query.filter(games::black_id.eq(player1));
            }
            if let Some(player2) = query.player2 {
                sql_query = sql_query.filter(games::white_id.eq(player2));
                count_query = count_query.filter(games::white_id.eq(player2));
            }

            if let Some(range1) = query.range1 {
                sql_query = sql_query.filter(games::black_elo.between(range1.0, range1.1));
                count_query = count_query.filter(games::black_elo.between(range1.0, range1.1));
            }

            if let Some(range2) = query.range2 {
                sql_query = sql_query.filter(games::white_elo.between(range2.0, range2.1));
                count_query = count_query.filter(games::white_elo.between(range2.0, range2.1));
            }
        }
        Some(Sides::WhiteBlack) => {
            if let Some(player1) = query.player1 {
                sql_query = sql_query.filter(games::white_id.eq(player1));
                count_query = count_query.filter(games::white_id.eq(player1));
            }
            if let Some(player2) = query.player2 {
                sql_query = sql_query.filter(games::black_id.eq(player2));
                count_query = count_query.filter(games::black_id.eq(player2));
            }

            if let Some(range1) = query.range1 {
                sql_query = sql_query.filter(games::white_elo.between(range1.0, range1.1));
                count_query = count_query.filter(games::white_elo.between(range1.0, range1.1));
            }

            if let Some(range2) = query.range2 {
                sql_query = sql_query.filter(games::black_elo.between(range2.0, range2.1));
                count_query = count_query.filter(games::black_elo.between(range2.0, range2.1));
            }
        }
        Some(Sides::Any) => {
            if let Some(player1) = query.player1 {
                sql_query =
                    sql_query.filter(games::white_id.eq(player1).or(games::black_id.eq(player1)));
                count_query =
                    count_query.filter(games::white_id.eq(player1).or(games::black_id.eq(player1)));
            }
            if let Some(player2) = query.player2 {
                sql_query =
                    sql_query.filter(games::white_id.eq(player2).or(games::black_id.eq(player2)));
                count_query =
                    count_query.filter(games::white_id.eq(player2).or(games::black_id.eq(player2)));
            }

            if let (Some(range1), Some(range2)) = (query.range1, query.range2) {
                sql_query = sql_query.filter(
                    games::white_elo
                        .between(range1.0, range1.1)
                        .or(games::black_elo.between(range1.0, range1.1))
                        .or(games::white_elo
                            .between(range2.0, range2.1)
                            .or(games::black_elo.between(range2.0, range2.1))),
                );
                count_query = count_query.filter(
                    games::white_elo
                        .between(range1.0, range1.1)
                        .or(games::black_elo.between(range1.0, range1.1))
                        .or(games::white_elo
                            .between(range2.0, range2.1)
                            .or(games::black_elo.between(range2.0, range2.1))),
                );
            } else {
                if let Some(range1) = query.range1 {
                    sql_query = sql_query.filter(
                        games::white_elo
                            .between(range1.0, range1.1)
                            .or(games::black_elo.between(range1.0, range1.1)),
                    );
                    count_query = count_query.filter(
                        games::white_elo
                            .between(range1.0, range1.1)
                            .or(games::black_elo.between(range1.0, range1.1)),
                    );
                }

                if let Some(range2) = query.range2 {
                    sql_query = sql_query.filter(
                        games::white_elo
                            .between(range2.0, range2.1)
                            .or(games::black_elo.between(range2.0, range2.1)),
                    );
                    count_query = count_query.filter(
                        games::white_elo
                            .between(range2.0, range2.1)
                            .or(games::black_elo.between(range2.0, range2.1)),
                    );
                }
            }
        }
        None => {}
    }

    sql_query = match query_options.sort {
        GameSort::Id => match query_options.direction {
            SortDirection::Asc => sql_query.order(games::id.asc()),
            SortDirection::Desc => sql_query.order(games::id.desc()),
        },
        GameSort::Date => match query_options.direction {
            SortDirection::Asc => sql_query.order((games::date.asc(), games::time.asc())),
            SortDirection::Desc => sql_query.order((games::date.desc(), games::time.desc())),
        },
        GameSort::WhiteElo => match query_options.direction {
            SortDirection::Asc => sql_query.order(games::white_elo.asc()),
            SortDirection::Desc => sql_query.order(games::white_elo.desc()),
        },
        GameSort::BlackElo => match query_options.direction {
            SortDirection::Asc => sql_query.order(games::black_elo.asc()),
            SortDirection::Desc => sql_query.order(games::black_elo.desc()),
        },
        GameSort::PlyCount => match query_options.direction {
            SortDirection::Asc => sql_query.order(games::ply_count.asc()),
            SortDirection::Desc => sql_query.order(games::ply_count.desc()),
        },
    };

    if !query_options.skip_count {
        count = Some(
            count_query
                .select(diesel::dsl::count(games::id))
                .first(db)?,
        );
    }

    let games: Vec<(Game, Player, Player, Event, Site)> = sql_query.load(db)?;
    let normalized_games = normalize_games(games)?;

    Ok(QueryResponse {
        data: normalized_games,
        count: count.map(|c| c as i32),
    })
}

fn normalize_games(games: Vec<(Game, Player, Player, Event, Site)>) -> Result<Vec<NormalizedGame>> {
    games
        .into_iter()
        .map(|(game, white, black, event, site)| core::normalize_game(game, white, black, event, site))
        .collect::<Result<_>>()
}

#[derive(Debug, Clone, Deserialize, Type)]
pub struct PlayerQuery {
    pub options: QueryOptions<PlayerSort>,
    #[specta(optional)]
    pub name: Option<String>,
    #[specta(optional)]
    pub range: Option<(i32, i32)>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum PlayerSort {
    #[serde(rename = "id")]
    Id,
    #[serde(rename = "name")]
    Name,
    #[serde(rename = "elo")]
    Elo,
}

#[tauri::command]
#[specta::specta]
pub async fn get_player(
    file: PathBuf,
    id: i32,
    state: tauri::State<'_, AppState>,
) -> Result<Option<Player>> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;
    let player = players::table
        .filter(players::id.eq(id))
        .first::<Player>(db)
        .optional()?;
    Ok(player)
}

#[tauri::command]
#[specta::specta]
pub async fn get_players(
    file: PathBuf,
    query: PlayerQuery,
    state: tauri::State<'_, AppState>,
) -> Result<QueryResponse<Vec<Player>>> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;
    let mut count: Option<i64> = None;

    let mut sql_query = players::table.into_boxed();
    let mut count_query = players::table.into_boxed();
    sql_query = sql_query.filter(players::name.is_not("Unknown"));
    count_query = count_query.filter(players::name.is_not("Unknown"));

    if let Some(name) = query.name {
        sql_query = sql_query.filter(players::name.like(format!("%{}%", name)));
        count_query = count_query.filter(players::name.like(format!("%{}%", name)));
    }

    if let Some(range) = query.range {
        sql_query = sql_query.filter(players::elo.between(range.0, range.1));
        count_query = count_query.filter(players::elo.between(range.0, range.1));
    }

    if !query.options.skip_count {
        count = Some(count_query.count().get_result(db)?);
    }

    if let Some(limit) = query.options.page_size {
        sql_query = sql_query.limit(limit as i64);
    }

    if let Some(page) = query.options.page {
        sql_query = sql_query.offset(((page - 1) * query.options.page_size.unwrap_or(10)) as i64);
    }

    sql_query = match query.options.sort {
        PlayerSort::Id => match query.options.direction {
            SortDirection::Asc => sql_query.order(players::id.asc()),
            SortDirection::Desc => sql_query.order(players::id.desc()),
        },
        PlayerSort::Name => match query.options.direction {
            SortDirection::Asc => sql_query.order(players::name.asc()),
            SortDirection::Desc => sql_query.order(players::name.desc()),
        },
        PlayerSort::Elo => match query.options.direction {
            SortDirection::Asc => sql_query.order(players::elo.asc()),
            SortDirection::Desc => sql_query.order(players::elo.desc()),
        },
    };

    let players = sql_query.load::<Player>(db)?;

    Ok(QueryResponse {
        data: players,
        count: count.map(|c| c as i32),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum TournamentSort {
    #[serde(rename = "id")]
    Id,
    #[serde(rename = "name")]
    Name,
}

#[derive(Debug, Clone, Deserialize, Type)]
pub struct TournamentQuery {
    pub options: QueryOptions<TournamentSort>,
    pub name: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn get_tournaments(
    file: PathBuf,
    query: TournamentQuery,
    state: tauri::State<'_, AppState>,
) -> Result<QueryResponse<Vec<Event>>> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;
    let mut count: Option<i64> = None;

    let mut sql_query = events::table.into_boxed();
    let mut count_query = events::table.into_boxed();
    sql_query = sql_query.filter(events::name.is_not("Unknown").and(events::name.is_not("")));
    count_query = count_query.filter(events::name.is_not("Unknown").and(events::name.is_not("")));

    if let Some(name) = query.name {
        sql_query = sql_query.filter(events::name.like(format!("%{}%", name)));
        count_query = count_query.filter(events::name.like(format!("%{}%", name)));
    }

    if !query.options.skip_count {
        count = Some(count_query.count().get_result(db)?);
    }

    if let Some(limit) = query.options.page_size {
        sql_query = sql_query.limit(limit as i64);
    }

    if let Some(page) = query.options.page {
        sql_query = sql_query.offset(((page - 1) * query.options.page_size.unwrap_or(10)) as i64);
    }

    sql_query = match query.options.sort {
        TournamentSort::Id => match query.options.direction {
            SortDirection::Asc => sql_query.order(events::id.asc()),
            SortDirection::Desc => sql_query.order(events::id.desc()),
        },
        TournamentSort::Name => match query.options.direction {
            SortDirection::Asc => sql_query.order(events::name.asc()),
            SortDirection::Desc => sql_query.order(events::name.desc()),
        },
    };

    let events = sql_query.load::<Event>(db)?;

    Ok(QueryResponse {
        data: events,
        count: count.map(|c| c as i32),
    })
}

#[derive(Debug, Clone, Serialize, Type, Default)]
pub struct PlayerGameInfo {
    pub site_stats_data: Vec<SiteStatsData>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[repr(u8)] // Ensure minimal memory usage (as u8)
pub enum GameOutcome {
    #[default]
    Won = 0,
    Drawn = 1,
    Lost = 2,
}

impl GameOutcome {
    pub fn from_str(result_str: &str, is_white: bool) -> Option<Self> {
        match result_str {
            "1-0" => Some(if is_white {
                GameOutcome::Won
            } else {
                GameOutcome::Lost
            }),
            "1/2-1/2" => Some(GameOutcome::Drawn),
            "0-1" => Some(if is_white {
                GameOutcome::Lost
            } else {
                GameOutcome::Won
            }),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Type, Default)]
pub struct SiteStatsData {
    pub site: String,
    pub player: String,
    pub data: Vec<StatsData>,
}

#[derive(Debug, Clone, Serialize, Type, Default)]
pub struct StatsData {
    pub date: String,
    pub is_player_white: bool,
    pub player_elo: i32,
    pub result: GameOutcome,
    pub time_control: String,
    pub opening: String,
}

#[derive(Serialize, Debug, Clone, Type, tauri_specta::Event)]
pub struct DatabaseProgress {
    pub id: String,
    pub progress: f64,
}

#[tauri::command]
#[specta::specta]
pub async fn get_players_game_info(
    file: PathBuf,
    id: i32,
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<PlayerGameInfo> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;
    let timer = Instant::now();

    let sql_query = games::table
        .inner_join(sites::table.on(games::site_id.eq(sites::id)))
        .inner_join(players::table.on(players::id.eq(id)))
        .select((
            games::white_id,
            games::black_id,
            games::result,
            games::date,
            games::moves,
            games::white_elo,
            games::black_elo,
            games::time_control,
            sites::name,
            players::name,
        ))
        .filter(games::white_id.eq(id).or(games::black_id.eq(id)))
        .filter(games::fen.is_null());

    type GameInfo = (
        i32,
        i32,
        Option<String>,
        Option<String>,
        Vec<u8>,
        Option<i32>,
        Option<i32>,
        Option<String>,
        Option<String>,
        Option<String>,
    );
    let info: Vec<GameInfo> = sql_query.load(db)?;

    let mut game_info = PlayerGameInfo::default();
    let progress = AtomicUsize::new(0);
    game_info.site_stats_data = info
        .par_iter()
        .filter_map(
            |(
                white_id,
                black_id,
                outcome,
                date,
                moves,
                white_elo,
                black_elo,
                time_control,
                site,
                player,
            )| {
                let is_white = *white_id == id;
                let is_black = *black_id == id;
                let result = GameOutcome::from_str(outcome.as_deref()?, is_white);

                if !is_white && !is_black
                    || is_white && white_elo.is_none()
                    || is_black && black_elo.is_none()
                    || result.is_none()
                    || date.is_none()
                    || site.is_none()
                    || player.is_none()
                {
                    return None;
                }

                let site = site.as_deref().map(|s| {
                    if s.starts_with("https://lichess.org/") {
                        "Lichess".to_string()
                    } else {
                        s.to_string()
                    }
                })?;

                let mut setups = vec![];
                let mut chess = Chess::default();
                for (i, byte) in moves.iter().enumerate() {
                    if i > 54 {
                        // max length of opening in data
                        break;
                    }
                    let m = match decode_move(*byte, &chess) {
                        Some(m) => m,
                        None => break, // Stop processing moves if decoding fails
                    };
                    chess.play_unchecked(&m);
                    setups.push(chess.clone().into_setup(EnPassantMode::Legal));
                }

                setups.reverse();
                let opening = setups
                    .iter()
                    .find_map(|setup| get_opening_from_setup(setup.clone()).ok())
                    .unwrap_or_default();

                let p = progress.fetch_add(1, Ordering::Relaxed);
                if p % 1000 == 0 || p == info.len() - 1 {
                    let _ = DatabaseProgress {
                        id: id.to_string(),
                        progress: (p as f64 / info.len() as f64) * 100_f64,
                    }
                    .emit(&app);
                }

                Some(SiteStatsData {
                    site: site.clone(),
                    player: player.clone().unwrap(),
                    data: vec![StatsData {
                        date: date.clone().unwrap(),
                        is_player_white: is_white,
                        player_elo: if is_white {
                            white_elo.unwrap()
                        } else {
                            black_elo.unwrap()
                        },
                        result: result.unwrap(),
                        time_control: time_control.clone().unwrap_or_default(),
                        opening,
                    }],
                })
            },
        )
        .fold(
            || DashMap::new(),
            |acc, data| {
                acc.entry((data.site.clone(), data.player.clone()))
                    .or_insert_with(Vec::new)
                    .extend(data.data);
                acc
            },
        )
        .reduce(
            || DashMap::new(),
            |acc1, acc2| {
                for ((site, player), data) in acc2 {
                    acc1.entry((site, player))
                        .or_insert_with(Vec::new)
                        .extend(data);
                }
                acc1
            },
        )
        .into_iter()
        .map(|((site, player), data)| SiteStatsData { site, player, data })
        .collect();

    println!("get_players_game_info {:?}: {:?}", file, timer.elapsed());

    Ok(game_info)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_database(
    file: PathBuf,
    state: tauri::State<'_, AppState>,
) -> Result<()> {
    let pool = &state.connection_pool;
    let path_str = file.to_str().unwrap();
    pool.remove(path_str);

    // delete file
    remove_file(path_str)?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_duplicated_games(
    file: PathBuf,
    state: tauri::State<'_, AppState>,
) -> Result<()> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;

    db.batch_execute(
        "
        DELETE FROM Games
        WHERE ID IN (
            SELECT ID
            FROM (
                SELECT ID,
                    ROW_NUMBER() OVER (PARTITION BY EventID, SiteID, Round, WhiteID, BlackID, Moves, Date, UTCTime ORDER BY ID) AS RowNum
                FROM Games
            ) AS Subquery
            WHERE RowNum > 1
        );
        ",
    )?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_empty_games(
    file: PathBuf,
    state: tauri::State<'_, AppState>,
) -> Result<()> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;

    diesel::delete(games::table.filter(games::ply_count.eq(0))).execute(db)?;

    Ok(())
}

struct PgnGame {
    event: Option<String>,
    site: Option<String>,
    date: Option<String>,
    round: Option<String>,
    white: Option<String>,
    black: Option<String>,
    result: Option<String>,
    time_control: Option<String>,
    eco: Option<String>,
    white_elo: Option<String>,
    black_elo: Option<String>,
    ply_count: Option<String>,
    fen: Option<String>,
    moves: String,
}

impl PgnGame {
    fn write(&self, writer: &mut impl Write) -> Result<()> {
        writeln!(
            writer,
            "[Event \"{}\"]",
            self.event.as_deref().unwrap_or("")
        )?;
        writeln!(writer, "[Site \"{}\"]", self.site.as_deref().unwrap_or(""))?;
        writeln!(writer, "[Date \"{}\"]", self.date.as_deref().unwrap_or(""))?;
        writeln!(
            writer,
            "[Round \"{}\"]",
            self.round.as_deref().unwrap_or("")
        )?;
        writeln!(
            writer,
            "[White \"{}\"]",
            self.white.as_deref().unwrap_or("")
        )?;
        writeln!(
            writer,
            "[Black \"{}\"]",
            self.black.as_deref().unwrap_or("")
        )?;
        writeln!(
            writer,
            "[Result \"{}\"]",
            self.result.as_deref().unwrap_or("*")
        )?;
        if let Some(time_control) = self.time_control.as_deref() {
            writeln!(writer, "[TimeControl \"{}\"]", time_control)?;
        }
        if let Some(eco) = self.eco.as_deref() {
            writeln!(writer, "[ECO \"{}\"]", eco)?;
        }
        if let Some(white_elo) = self.white_elo.as_deref() {
            writeln!(writer, "[WhiteElo \"{}\"]", white_elo)?;
        }
        if let Some(black_elo) = self.black_elo.as_deref() {
            writeln!(writer, "[BlackElo \"{}\"]", black_elo)?;
        }
        if let Some(ply_count) = self.ply_count.as_deref() {
            writeln!(writer, "[PlyCount \"{}\"]", ply_count)?;
        }
        if let Some(fen) = self.fen.as_deref() {
            writeln!(writer, "[SetUp \"1\"]")?;
            writeln!(writer, "[FEN \"{}\"]", fen)?;
        }
        writeln!(writer)?;
        writer.write(self.moves.as_bytes())?;
        match self.result.as_deref() {
            Some("1-0") => writeln!(writer, "1-0"),
            Some("0-1") => writeln!(writer, "0-1"),
            Some("1/2-1/2") => writeln!(writer, "1/2-1/2"),
            _ => writeln!(writer, "*"),
        }?;
        writeln!(writer)?;
        Ok(())
    }
}

#[tauri::command]
#[specta::specta]
pub async fn export_to_pgn(
    file: PathBuf,
    dest_file: PathBuf,
    state: tauri::State<'_, AppState>,
) -> Result<()> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;

    let file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(dest_file)?;

    let mut writer = BufWriter::new(file);

    let (white_players, black_players) = diesel::alias!(players as white, players as black);
    games::table
        .inner_join(white_players.on(games::white_id.eq(white_players.field(players::id))))
        .inner_join(black_players.on(games::black_id.eq(black_players.field(players::id))))
        .inner_join(events::table.on(games::event_id.eq(events::id)))
        .inner_join(sites::table.on(games::site_id.eq(sites::id)))
        .load_iter::<(Game, Player, Player, Event, Site), DefaultLoadingMode>(db)?
        .flatten()
        .map(|(game, white, black, event, site)| {
            let pgn = PgnGame {
                event: event.name,
                site: site.name,
                date: game.date,
                round: game.round,
                white: white.name,
                black: black.name,
                result: game.result,
                time_control: game.time_control,
                eco: game.eco,
                white_elo: game.white_elo.map(|e| e.to_string()),
                black_elo: game.black_elo.map(|e| e.to_string()),
                ply_count: game.ply_count.map(|e| e.to_string()),
                fen: game.fen.clone(),
                 moves: GameTree::from_bytes(
                    &game.moves,
                    game.fen
                        .map(|fen| Fen::from_ascii(fen.as_bytes()).ok())
                        .flatten()
                        .map(|fen| Chess::from_setup(fen.into(), CastlingMode::Chess960).ok())
                        .flatten()
                )?.to_string(),
            };

            pgn.write(&mut writer)?;

            Ok(())
        })
        .collect::<Result<Vec<_>>>()?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_db_game(
    file: PathBuf,
    game_id: i32,
    state: tauri::State<'_, AppState>,
) -> Result<()> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;

    core::remove_game(db, game_id)?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_game(
    file: PathBuf,
    game_id: i32,
    state: tauri::State<'_, AppState>,
) -> Result<NormalizedGame> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;

    Ok(core::get_game(db, game_id)?)
}

#[tauri::command]
#[specta::specta]
pub async fn update_game(
    file: PathBuf,
    game_id: i32,
    update: UpdateGame,
    state: tauri::State<'_, AppState>,
) -> Result<()> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;

    core::update_game(db, game_id, &update)?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn merge_players(
    file: PathBuf,
    player1: i32,
    player2: i32,
    state: tauri::State<'_, AppState>,
) -> Result<()> {
    let db = &mut get_db_or_create(&state, file.to_str().unwrap(), ConnectionOptions::default())?;

    // Check if the players never played against each other
    let count: i64 = games::table
        .filter(games::white_id.eq(player1).and(games::black_id.eq(player2)))
        .or_filter(games::white_id.eq(player2).and(games::black_id.eq(player1)))
        .limit(1)
        .count()
        .get_result(db)?;

    if count > 0 {
        return Err(Error::NotDistinctPlayers);
    }

    diesel::update(games::table.filter(games::white_id.eq(player1)))
        .set(games::white_id.eq(player2))
        .execute(db)?;
    diesel::update(games::table.filter(games::black_id.eq(player1)))
        .set(games::black_id.eq(player2))
        .execute(db)?;

    diesel::delete(players::table.filter(players::id.eq(player1))).execute(db)?;

    let player_count: i64 = players::table.count().get_result(db)?;
    diesel::insert_into(info::table)
        .values((
            info::name.eq("PlayerCount"),
            info::value.eq(player_count.to_string()),
        ))
        .on_conflict(info::name)
        .do_update()
        .set(info::value.eq(player_count.to_string()))
        .execute(db)?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn clear_games(state: tauri::State<'_, AppState>) {
    let mut state = state.db_cache.lock().unwrap();
    state.clear();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn home_row() {
        use shakmaty::Board;

        let pawn_home = get_pawn_home(&Board::default());
        assert_eq!(pawn_home, 0b1111111111111111);

        let pawn_home = get_pawn_home(
            &Board::from_ascii_board_fen(b"8/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/8").unwrap(),
        );
        assert_eq!(pawn_home, 0b1110111111101111);

        let pawn_home = get_pawn_home(&Board::from_ascii_board_fen(b"8/8/8/8/8/8/8/8").unwrap());
        assert_eq!(pawn_home, 0b0000000000000000);
    }
}
