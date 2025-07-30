import { Accordion, Box, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { useLoaderData } from "@tanstack/react-router";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "zustand";
import { commands } from "@/bindings";
import GameInfo from "@/components/common/GameInfo";
import { TreeStateContext } from "@/components/common/TreeStateContext";
import { currentTabAtom, missingMovesAtom } from "@/state/atoms";
import { keyMapAtom } from "@/state/keybindings";
import { parsePGN } from "@/utils/chess";
import { formatNumber } from "@/utils/format";
import { getTreeStats } from "@/utils/repertoire";
import { saveToFile } from "@/utils/tabs";
import { getNodeAtPath } from "@/utils/treeReducer";
import { unwrap } from "@/utils/unwrap";
import FenSearch from "./FenSearch";
import FileInfo from "./FileInfo";
import GameSelector from "./GameSelector";
import PgnInput from "./PgnInput";

function InfoPanel() {
  const store = useContext(TreeStateContext)!;
  const root = useStore(store, (s) => s.root);
  const position = useStore(store, (s) => s.position);
  const headers = useStore(store, (s) => s.headers);
  const currentNode = getNodeAtPath(root, position);
  const [games, setGames] = useState<Map<number, string>>(new Map());
  const currentTab = useAtomValue(currentTabAtom);
  const isReportoire = currentTab?.file?.metadata.type === "repertoire";

  const { t } = useTranslation();

  const stats = useMemo(() => getTreeStats(root), [root]);

  return (
    <Stack h="100%">
      <GameSelectorAccordion games={games} setGames={setGames} />
      <ScrollArea offsetScrollbars>
        <FileInfo setGames={setGames} />
        <Stack>
          <GameInfo
            headers={headers}
            simplified={isReportoire}
            changeTitle={(title: string) => {
              setGames((prev) => {
                const newGames = new Map(prev);
                newGames.set(currentTab?.gameNumber || 0, title);
                return newGames;
              });
            }}
          />
          <FenSearch currentFen={currentNode.fen} />
          <PgnInput />

          <Group>
            <Text>
              {t("PgnInput.Variations")}: {stats.leafs}
            </Text>
            <Text>
              {t("PgnInput.MaxDepth")}: {stats.depth}
            </Text>
            <Text>
              {t("PgnInput.TotalMoves")}: {stats.total}
            </Text>
          </Group>
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

function GameSelectorAccordion({
  games,
  setGames,
}: {
  games: Map<number, string>;
  setGames: React.Dispatch<React.SetStateAction<Map<number, string>>>;
}) {
  const { t } = useTranslation();
  const store = useContext(TreeStateContext)!;
  const dirty = useStore(store, (s) => s.dirty);
  const setState = useStore(store, (s) => s.setState);
  const [currentTab, setCurrentTab] = useAtom(currentTabAtom);
  const setMissingMoves = useSetAtom(missingMovesAtom);
  const [tempPage, setTempPage] = useState(0);
  const { documentDir } = useLoaderData({ from: "/" });

  if (!currentTab?.file) return null;

  const gameNumber = currentTab.gameNumber || 0;
  const currentName = games.get(gameNumber) || "Untitled";

  async function setPage(page: number, forced?: boolean) {
    if (!forced && dirty) {
      setTempPage(page);
      modals.openConfirmModal({
        title: t("Common.UnsavedChanges.Title"),
        withCloseButton: false,
        children: <Text>{t("Common.UnsavedChanges.Desc")}</Text>,
        labels: { confirm: t("Common.SaveAndClose"), cancel: t("Common.CloseWithoutSaving") },
        onConfirm: async () => {
          saveToFile({
            dir: documentDir,
            setCurrentTab,
            tab: currentTab,
            store,
          });
          setPage(tempPage, true);
        },
        onCancel: () => {
          setPage(tempPage, true);
        },
      });
      return;
    }

    if (!currentTab?.file) return;

    const data = unwrap(await commands.readGames(currentTab.file.path, page, page));
    const tree = await parsePGN(data[0]);
    setState(tree);

    setCurrentTab((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        gameNumber: page,
      };
    });

    setMissingMoves((prev) => ({
      ...prev,
      [currentTab?.value]: null,
    }));
  }

  async function deleteGame(index: number) {
    await commands.deleteGame(currentTab?.file?.path!, index);
    setCurrentTab((prev) => {
      if (!prev.file) return prev;
      prev.file.numGames -= 1;
      return { ...prev };
    });
    setGames(new Map());
  }

  const keyMap = useAtomValue(keyMapAtom);
  useHotkeys([
    [keyMap.NEXT_GAME.keys, () => setPage(Math.min(gameNumber + 1, currentTab.file!.numGames - 1))],
    [keyMap.PREVIOUS_GAME.keys, () => setPage(Math.max(0, gameNumber - 1))],
  ]);

  return (
    <Accordion>
      <Accordion.Item value="game">
        <Accordion.Control>
          {formatNumber(gameNumber + 1)}. {currentName}
        </Accordion.Control>
        <Accordion.Panel>
          <Box h="10rem">
            <GameSelector
              games={games}
              setGames={setGames}
              setPage={setPage}
              deleteGame={deleteGame}
              path={currentTab.file.path}
              activePage={gameNumber || 0}
              total={currentTab.file.numGames}
            />
          </Box>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
export default InfoPanel;
