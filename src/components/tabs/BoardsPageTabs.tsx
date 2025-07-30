import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { ActionIcon, Group, Kbd, Menu, ScrollArea, Tabs, Text } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconChess, IconFileImport, IconPlus, IconPuzzle } from "@tabler/icons-react";
import { useLoaderData } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { type JSX, useCallback, useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Mosaic, type MosaicNode } from "react-mosaic-component";
import { match } from "ts-pattern";
import { commands } from "@/bindings";
import { activeTabAtom, currentTabAtom, tabsAtom } from "@/state/atoms";
import { keyMapAtom } from "@/state/keybindings";
import { createTab, genID, saveToFile, type Tab } from "@/utils/tabs";
import { unwrap } from "@/utils/unwrap";
import BoardAnalysis from "../boards/BoardAnalysis";
import BoardGame from "../boards/BoardGame";
import { TreeStateContext, TreeStateProvider } from "../common/TreeStateContext";
import Chessboard from "../icons/Chessboard";
import ReportProgressSubscriber from "../panels/analysis/ReportProgressSubscriber";
import Puzzles from "../puzzles/Puzzles";
import * as classes from "./BoardsPage.css";
import { BoardTab } from "./BoardTab";
import NewTabHome from "./NewTabHome";

import "react-mosaic-component/react-mosaic-component.css";
import "@/styles/react-mosaic.css";

export default function BoardsPageTabs() {
  const { t } = useTranslation();

  const [tabs, setTabs] = useAtom(tabsAtom);
  const [activeTab, setActiveTab] = useAtom(activeTabAtom);
  const [currentTab, setCurrentTab] = useAtom(currentTabAtom);
  const store = useContext(TreeStateContext)!;
  const { documentDir } = useLoaderData({ from: "/" });

  useEffect(() => {
    if (tabs.length === 0) {
      createTab({
        tab: { name: t("Tab.NewTab"), type: "new" },
        setTabs,
        setActiveTab,
      });
    }
  }, [tabs, setActiveTab, setTabs]);

  const closeTab = useCallback(
    async (value: string | null, forced?: boolean) => {
      if (value !== null) {
        const closedTab = tabs.find((tab) => tab.value === value);
        const tabState = JSON.parse(sessionStorage.getItem(value) || "{}");
        if (tabState && closedTab?.file && tabState.state.dirty && !forced) {
          modals.openConfirmModal({
            title: "Unsaved Changes",
            withCloseButton: false,
            children: <Text>You have unsaved changes. Do you want to save them before closing?</Text>,
            labels: { confirm: "Save and Close", cancel: "Close Without Saving" },
            onConfirm: async () => {
              saveToFile({
                dir: documentDir,
                setCurrentTab,
                tab: currentTab,
                store,
              });
              closeTab(activeTab, true);
            },
            onCancel: () => {
              closeTab(activeTab, true);
            },
          });
          return;
        }
        if (value === activeTab) {
          const index = tabs.findIndex((tab) => tab.value === value);
          if (tabs.length > 1) {
            if (index === tabs.length - 1) {
              setActiveTab(tabs[index - 1].value);
            } else {
              setActiveTab(tabs[index + 1].value);
            }
          } else {
            setActiveTab(null);
          }
        }
        setTabs((prev) => prev.filter((tab) => tab.value !== value));
        unwrap(await commands.killEngines(value));
      }
    },
    [tabs, activeTab, setTabs, setActiveTab],
  );

  function selectTab(index: number) {
    setActiveTab(tabs[Math.min(index, tabs.length - 1)].value);
  }

  function cycleTabs(reverse = false) {
    const index = tabs.findIndex((tab) => tab.value === activeTab);
    if (reverse) {
      if (index === 0) {
        setActiveTab(tabs[tabs.length - 1].value);
      } else {
        setActiveTab(tabs[index - 1].value);
      }
    } else {
      if (index === tabs.length - 1) {
        setActiveTab(tabs[0].value);
      } else {
        setActiveTab(tabs[index + 1].value);
      }
    }
  }

  const renameTab = useCallback(
    (value: string, name: string) => {
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.value === value) {
            return { ...tab, name };
          }
          return tab;
        }),
      );
    },
    [setTabs],
  );

  const duplicateTab = useCallback(
    (value: string) => {
      const id = genID();
      const tab = tabs.find((tab) => tab.value === value);
      if (sessionStorage.getItem(value)) {
        sessionStorage.setItem(id, sessionStorage.getItem(value) || "");
      }

      if (tab) {
        setTabs((prev) => [
          ...prev,
          {
            name: tab.name,
            value: id,
            type: tab.type,
          },
        ]);
        setActiveTab(id);
      }
    },
    [tabs, setTabs, setActiveTab],
  );

  const keyMap = useAtomValue(keyMapAtom);
  useHotkeys([
    [keyMap.CLOSE_BOARD_TAB.keys, () => closeTab(activeTab)],
    [keyMap.CYCLE_BOARD_TABS.keys, () => cycleTabs()],
    [keyMap.REVERSE_CYCLE_BOARD_TABS.keys, () => cycleTabs(true)],
    [keyMap.BOARD_TAB_ONE.keys, () => selectTab(0)],
    [keyMap.BOARD_TAB_TWO.keys, () => selectTab(1)],
    [keyMap.BOARD_TAB_THREE.keys, () => selectTab(2)],
    [keyMap.BOARD_TAB_FOUR.keys, () => selectTab(3)],
    [keyMap.BOARD_TAB_FIVE.keys, () => selectTab(4)],
    [keyMap.BOARD_TAB_SIX.keys, () => selectTab(5)],
    [keyMap.BOARD_TAB_SEVEN.keys, () => selectTab(6)],
    [keyMap.BOARD_TAB_EIGHT.keys, () => selectTab(7)],
    [keyMap.BOARD_TAB_LAST.keys, () => selectTab(tabs.length - 1)],
  ]);

  return (
    <Tabs
      value={activeTab}
      onChange={(v) => setActiveTab(v)}
      keepMounted={false}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      <ScrollArea h="3.75rem" px="md" pt="sm" scrollbarSize={8}>
        <DragDropContext
          onDragEnd={({ destination, source }) =>
            destination?.index !== undefined &&
            setTabs((prev) => {
              const result = Array.from(prev);
              const [removed] = result.splice(source.index, 1);
              result.splice(destination.index, 0, removed);
              return result;
            })
          }
        >
          <Droppable droppableId="droppable" direction="horizontal">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: "flex" }}>
                {tabs.map((tab, i) => (
                  <Draggable key={tab.value} draggableId={tab.value} index={i}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                        <BoardTab
                          tab={tab}
                          setActiveTab={setActiveTab}
                          closeTab={closeTab}
                          renameTab={renameTab}
                          duplicateTab={duplicateTab}
                          selected={activeTab === tab.value}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <Menu shadow="md" position="right-start">
                  <Menu.Target>
                    <ActionIcon
                      variant="default"
                      size="lg"
                      classNames={{
                        root: classes.newTab,
                      }}
                    >
                      <IconPlus />
                    </ActionIcon>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconChess size={14} />}
                      onClick={() =>
                        createTab({
                          tab: {
                            name: "New Game",
                            type: "play",
                          },
                          setTabs,
                          setActiveTab,
                        })
                      }
                    >
                      <Group justify="space-between">
                        Play{" "}
                        <Kbd size="xs" style={{ borderWidth: "1px" }}>
                          {keyMap.PLAY_BOARD.keys}
                        </Kbd>
                      </Group>
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<Chessboard size={14} />}
                      onClick={() =>
                        createTab({
                          tab: {
                            name: t("Home.Card.AnalysisBoard.Title"),
                            type: "analysis",
                          },
                          setTabs,
                          setActiveTab,
                        })
                      }
                    >
                      <Group justify="space-between">
                        Analyze{" "}
                        <Kbd size="xs" style={{ borderWidth: "1px" }}>
                          {keyMap.ANALYZE_BOARD.keys}
                        </Kbd>
                      </Group>
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconFileImport size={14} />}
                      onClick={() => {
                        modals.openContextModal({
                          modal: "importModal",
                          innerProps: {},
                        });
                      }}
                    >
                      <Group justify="space-between">
                        Import{" "}
                        <Kbd size="xs" style={{ borderWidth: "1px" }}>
                          {keyMap.IMPORT_BOARD.keys}
                        </Kbd>
                      </Group>
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconPuzzle size={14} />}
                      onClick={() =>
                        createTab({
                          tab: {
                            name: "Puzzle Training",
                            type: "puzzles",
                          },
                          setTabs,
                          setActiveTab,
                        })
                      }
                    >
                      <Group justify="space-between">
                        Train{" "}
                        <Kbd size="xs" style={{ borderWidth: "1px" }}>
                          {keyMap.TRAIN_BOARD.keys}
                        </Kbd>
                      </Group>
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </ScrollArea>
      {tabs.map((tab) => (
        <Tabs.Panel key={tab.value} value={tab.value} h="100%" w="100%" pb="sm" px="sm">
          <TabSwitch tab={tab} />
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

type ViewId = "left" | "topRight" | "bottomRight";

const fullLayout: { [viewId: string]: JSX.Element } = {
  left: <div id="left" />,
  topRight: <div id="topRight" />,
  bottomRight: <div id="bottomRight" />,
};

interface WindowsState {
  currentNode: MosaicNode<ViewId> | null;
}

const windowsStateAtom = atomWithStorage<WindowsState>("windowsState", {
  currentNode: {
    direction: "row",
    first: "left",
    second: {
      direction: "column",
      first: "topRight",
      second: "bottomRight",
    },
  },
});

function TabSwitch({ tab }: { tab: Tab }) {
  const [windowsState, setWindowsState] = useAtom(windowsStateAtom);

  return match(tab.type)
    .with("new", () => <NewTabHome id={tab.value} />)
    .with("play", () => (
      <TreeStateProvider id={tab.value}>
        <Mosaic<ViewId>
          renderTile={(id) => fullLayout[id]}
          value={windowsState.currentNode}
          onChange={(currentNode) => setWindowsState({ currentNode })}
          resize={{ minimumPaneSizePercentage: 0 }}
        />
        <BoardGame />
      </TreeStateProvider>
    ))
    .with("analysis", () => (
      <TreeStateProvider id={tab.value}>
        <Mosaic<ViewId>
          renderTile={(id) => fullLayout[id]}
          value={windowsState.currentNode}
          onChange={(currentNode) => setWindowsState({ currentNode })}
          resize={{ minimumPaneSizePercentage: 0 }}
        />
        <ReportProgressSubscriber id={`report_${tab.value}`} />
        <BoardAnalysis />
      </TreeStateProvider>
    ))
    .with("puzzles", () => (
      <TreeStateProvider id={tab.value}>
        <Mosaic<ViewId>
          renderTile={(id) => fullLayout[id]}
          value={windowsState.currentNode}
          onChange={(currentNode) => setWindowsState({ currentNode })}
          resize={{ minimumPaneSizePercentage: 0 }}
        />
        <Puzzles id={tab.value} />
      </TreeStateProvider>
    ))
    .exhaustive();
}
