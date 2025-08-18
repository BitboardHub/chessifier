import { Box } from "@mantine/core";
import { useElementSize, useForceUpdate } from "@mantine/hooks";
import { Chess, type Move, makeUci, type NormalMove, parseSquare } from "chessops";
import { chessgroundDests, chessgroundMove } from "chessops/compat";
import { parseFen } from "chessops/fen";
import equal from "fast-deep-equal";
import { useAtom, useAtomValue } from "jotai";
import { useContext, useState } from "react";
import { useStore } from "zustand";
import { Chessground } from "@/chessground/Chessground";
import { TreeStateContext } from "@/common/components/TreeStateContext";
import { jumpToNextPuzzleAtom, showCoordinatesAtom } from "@/state/atoms";
import { chessboard } from "@/styles/Chessboard.css";
import { positionFromFen } from "@/utils/chessops";
import { recordPuzzleSolved } from "@/utils/puzzleStreak";
import type { Completion, Puzzle } from "@/utils/puzzles";
import { getNodeAtPath, treeIteratorMainLine } from "@/utils/treeReducer";
import PromotionModal from "../boards/PromotionModal";

function PuzzleBoard({
  puzzles,
  currentPuzzle,
  changeCompletion,
  generatePuzzle,
  db,
}: {
  puzzles: Puzzle[];
  currentPuzzle: number;
  changeCompletion: (completion: Completion) => void;
  generatePuzzle: (db: string) => void;
  db: string | null;
}) {
  const store = useContext(TreeStateContext);
  if (!store) {
    throw new Error("PuzzleBoard must be used within a TreeStateContext provider");
  }
  const root = useStore(store, (s) => s.root);
  const position = useStore(store, (s) => s.position);
  const makeMove = useStore(store, (s) => s.makeMove);
  const makeMoves = useStore(store, (s) => s.makeMoves);
  const reset = useForceUpdate();
  const [jumpToNextPuzzleImmediately] = useAtom(jumpToNextPuzzleAtom);

  const currentNode = getNodeAtPath(root, position);

  let puzzle: Puzzle | null = null;
  if (puzzles.length > 0) {
    puzzle = puzzles[currentPuzzle];
  }
  const [ended, setEnded] = useState(false);

  const [pos] = positionFromFen(currentNode.fen);
  const initialFen = puzzle?.fen || currentNode.fen;
  const [initialPos] = positionFromFen(initialFen);
  

  const treeIter = treeIteratorMainLine(root);
  treeIter.next();
  let currentMove = 0;
  if (puzzle) {
    for (const { node } of treeIter) {
      if (node.move && makeUci(node.move) === puzzle.moves[currentMove]) {
        currentMove++;
      } else {
        break;
      }
    }
  }
  const turn = pos?.turn || "white";
  let orientation = initialPos?.turn || "white";
  if ((puzzle?.moves.length || 0) % 2 === 0) {
    orientation = orientation === "white" ? "black" : "white";
  }
  
  const [pendingMove, setPendingMove] = useState<NormalMove | null>(null);

  const dests = pos ? chessgroundDests(pos) : new Map();
  const showCoordinates = useAtomValue(showCoordinatesAtom);

  function checkMove(move: Move) {
    if (!pos) return;
    if (!puzzle) return;

    const newPos = pos.clone();
    const uci = makeUci(move);
    newPos.play(move);

    if (puzzle.moves[currentMove] === uci || newPos.isCheckmate()) {
      if (currentMove === puzzle.moves.length - 1) {
        if (puzzle.completion === "incomplete") {
          changeCompletion("correct");
          recordPuzzleSolved();
        }
        setEnded(false);

        if (db && jumpToNextPuzzleImmediately) {
          generatePuzzle(db);
        }
      }
      const newMoves = puzzle.moves.slice(currentMove, currentMove + 2);
      makeMoves({
        payload: newMoves,
        mainline: true,
        changeHeaders: false,
      });
    } else {
      makeMove({
        payload: move,
        changePosition: false,
        changeHeaders: false,
      });
      if (!ended) {
        changeCompletion("incorrect");
      }
      setEnded(true);
    }
    reset();
  }

  const { ref: parentRef, height: parentHeight } = useElementSize();

  return (
    <Box w="100%" h="100%" ref={parentRef}>
      <Box
        className={chessboard}
        style={{
          maxWidth: parentHeight,
        }}
      >
        <PromotionModal
          pendingMove={pendingMove}
          cancelMove={() => setPendingMove(null)}
          confirmMove={(p) => {
            if (pendingMove) {
              checkMove({ ...pendingMove, promotion: p });
              setPendingMove(null);
            }
          }}
          turn={turn}
          orientation={orientation}
        />
        <Chessground
          animation={{
            enabled: true,
          }}
          coordinates={showCoordinates}
          orientation={orientation}
          movable={{
            free: false,
            color:
              puzzle && equal(position, Array(currentMove).fill(0)) && puzzle.completion === "incomplete"
                ? turn
                : undefined,
            dests: dests,
            events: {
              after: (orig, dest) => {
                const from = parseSquare(orig);
                const to = parseSquare(dest);
                if (!from || !to) return;
                const move: NormalMove = { from, to };
                if (
                  pos &&
                  pos.board.get(from)?.role === "pawn" &&
                  ((dest[1] === "8" && turn === "white") || (dest[1] === "1" && turn === "black"))
                ) {
                  setPendingMove(move);
                } else {
                  checkMove(move);
                }
              },
            },
          }}
          lastMove={currentNode.move ? chessgroundMove(currentNode.move) : undefined}
          turnColor={turn}
          fen={currentNode.fen}
          check={pos?.isCheck()}
        />
      </Box>
    </Box>
  );
}

export default PuzzleBoard;
