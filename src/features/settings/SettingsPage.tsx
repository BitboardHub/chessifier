import { Box, Card, Group, ScrollArea, Select, Stack, Tabs, Text, TextInput, Title } from "@mantine/core";
import { IconBook, IconBrush, IconChess, IconFlag, IconFolder, IconMouse, IconVolume } from "@tabler/icons-react";
import { useLoaderData } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-dialog";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import FileInput from "@/common/components/FileInput";
import {
  autoPromoteAtom,
  autoSaveAtom,
  enableBoardScrollAtom,
  eraseDrawablesOnClickAtom,
  forcedEnPassantAtom,
  hideDashboardOnStartupAtom,
  minimumGamesAtom,
  moveInputAtom,
  moveMethodAtom,
  moveNotationTypeAtom,
  nativeBarAtom,
  percentageCoverageAtom,
  previewBoardOnHoverAtom,
  showArrowsAtom,
  showConsecutiveArrowsAtom,
  showCoordinatesAtom,
  showDestsAtom,
  snapArrowsAtom,
  spellCheckAtom,
  storedDocumentDirAtom,
} from "@/state/atoms";
import BoardSelect from "./components/BoardSelect";
import ColorControl from "./components/ColorControl";
import FontSizeSlider from "./components/FontSizeSlider";
import PiecesSelect from "./components/PiecesSelect";
import SettingsNumberInput from "./components/SettingsNumberInput";
import SettingsSwitch from "./components/SettingsSwitch";
import SoundSelect from "./components/SoundSelect";
import ThemeButton from "./components/ThemeButton";
import VolumeSlider from "./components/VolumeSlider";
import * as classes from "./SettingsPage.css";

export default function Page() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  const [isNative, setIsNative] = useAtom(nativeBarAtom);
  const {
    dirs: { documentDir },
  } = useLoaderData({ from: "/settings" });
  let [filesDirectory, setFilesDirectory] = useAtom(storedDocumentDirAtom);
  filesDirectory = filesDirectory || documentDir;

  const [moveMethod, setMoveMethod] = useAtom(moveMethodAtom);
  const [moveNotationType, setMoveNotationType] = useAtom(moveNotationTypeAtom);

  useEffect(() => {
    if (!containerRef.current) return;

    // @ts-ignore
    const children = containerRef.current.querySelectorAll("[data-searchable]");
    children.forEach((child: any) => {
      const texts = child.querySelectorAll("p");
      const title = texts?.[0].textContent.toLowerCase();
      const description = texts?.[1].textContent.toLowerCase();
      const match = title.includes(search.toLowerCase()) || description.includes(search.toLowerCase());
      child.parentNode.closest("div").style.display = match ? "" : "none";
    });
  }, [search]);

  return (
    <Box h="100%" style={{ overflow: "hidden" }}>
      <Title order={1} fw={500} p="lg" className={classes.title}>
        Settings
      </Title>
      <TextInput
        placeholder="Search settings"
        size="xs"
        mb="lg"
        px="lg"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      <Tabs ref={containerRef} defaultValue="board" orientation="vertical" h="100%">
        <Tabs.List>
          <Text c="dimmed" size="sm" pl="lg">
            Gameplay
          </Text>
          <Tabs.Tab
            value="board"
            leftSection={<IconChess size="1rem" />}
            classNames={{
              tab: classes.tabItem,
              tabLabel: classes.tabLabel,
            }}
          >
            {t("Settings.Board")}
          </Tabs.Tab>
          <Tabs.Tab
            value="inputs"
            leftSection={<IconMouse size="1rem" />}
            classNames={{
              tab: classes.tabItem,
              tabLabel: classes.tabLabel,
            }}
          >
            {t("Settings.Inputs")}
          </Tabs.Tab>
          <Tabs.Tab
            value="anarchy"
            leftSection={<IconFlag size="1rem" />}
            classNames={{
              tab: classes.tabItem,
              tabLabel: classes.tabLabel,
            }}
          >
            {t("Settings.Anarchy")}
          </Tabs.Tab>
          <Text c="dimmed" size="sm" mt="md" pl="lg">
            Analysis
          </Text>
          <Tabs.Tab
            value="report"
            leftSection={<IconBook size="1rem" />}
            classNames={{
              tab: classes.tabItem,
              tabLabel: classes.tabLabel,
            }}
          >
            {t("Settings.OpeningReport")}
          </Tabs.Tab>
          <Text c="dimmed" size="sm" mt="md" pl="lg">
            Interface
          </Text>
          <Tabs.Tab
            value="appearance"
            leftSection={<IconBrush size="1rem" />}
            classNames={{
              tab: classes.tabItem,
              tabLabel: classes.tabLabel,
            }}
          >
            {t("Settings.Appearance")}
          </Tabs.Tab>
          <Tabs.Tab
            value="sound"
            leftSection={<IconVolume size="1rem" />}
            classNames={{
              tab: classes.tabItem,
              tabLabel: classes.tabLabel,
            }}
          >
            {t("Settings.Sound")}
          </Tabs.Tab>
          <Text c="dimmed" size="sm" mt="md" pl="lg">
            System
          </Text>
          <Tabs.Tab
            value="directories"
            leftSection={<IconFolder size="1rem" />}
            classNames={{
              tab: classes.tabItem,
              tabLabel: classes.tabLabel,
            }}
          >
            {t("Settings.Directories")}
          </Tabs.Tab>
        </Tabs.List>
        <Stack flex={1}>
          <ScrollArea h="calc(100vh - 170px)">
            <Card className={classes.card} w="100%" pl="lg" pr="xl">
              <Tabs.Panel value="board">
                <Title order={1} fw={500} className={classes.title}>
                  {t("Settings.Board")}
                </Title>
                <Text size="xs" c="dimmed" mt={3} mb="lg">
                  {t("Settings.Board.Desc")}
                </Text>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.PieceDest")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.PieceDest.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={showDestsAtom} />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Arrows")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Arrows.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={showArrowsAtom} />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>Move notation</Text>
                    <Text size="xs" c="dimmed">
                      Choose how to display pieces in notation
                    </Text>
                  </div>
                  <Select
                    data={[
                      { label: "Letters (K Q R B N)", value: "letters" },
                      { label: "Symbols (♔♕♖♗♘)", value: "symbols" },
                    ]}
                    allowDeselect={false}
                    value={moveNotationType}
                    onChange={(val) => setMoveNotationType(val as "letters" | "symbols")}
                  />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>Ways to Move Pieces</Text>
                    <Text size="xs" c="dimmed">
                      Move pieces by dragging, clicking, or both
                    </Text>
                  </div>
                  <Select
                    data={[
                      { label: "Drag", value: "drag" },
                      { label: "Click", value: "select" },
                      { label: "Both", value: "both" },
                    ]}
                    allowDeselect={false}
                    value={moveMethod}
                    onChange={(val) => setMoveMethod(val as "drag" | "select" | "both")}
                  />
                </Group>

                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.SnapArrows")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.SnapArrows.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={snapArrowsAtom} />
                </Group>

                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.ConsecutiveArrows")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.ConsecutiveArrows.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={showConsecutiveArrowsAtom} />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.EraseDrawablesOnClick")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.EraseDrawablesOnClick.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={eraseDrawablesOnClickAtom} />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.AutoPromition")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.AutoPromition.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={autoPromoteAtom} />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Coordinates")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Coordinates.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={showCoordinatesAtom} />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.AutoSave")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.AutoSave.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={autoSaveAtom} />
                </Group>

                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.PreviewBoard")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.PreviewBoard.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={previewBoardOnHoverAtom} />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.ScrollThroughMoves")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.ScrollThroughMoves.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={enableBoardScrollAtom} />
                </Group>
              </Tabs.Panel>

              <Tabs.Panel value="inputs">
                <Title order={1} fw={500} className={classes.title}>
                  {t("Settings.Inputs")}
                </Title>
                <Text size="xs" c="dimmed" mt={3} mb="lg">
                  {t("Settings.Inputs.Desc")}
                </Text>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Inputs.TextInput")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Inputs.TextInput.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={moveInputAtom} />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Inputs.SpellCheck")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Inputs.SpellCheck.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={spellCheckAtom} />
                </Group>
              </Tabs.Panel>

              <Tabs.Panel value="anarchy">
                <Title order={1} fw={500} className={classes.title}>
                  {t("Settings.Anarchy")}
                </Title>
                <Text size="xs" c="dimmed" mt={3} mb="lg">
                  {t("Settings.Anarchy.Desc")}
                </Text>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Anarchy.ForcedChessifier")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Anarchy.ForcedChessifier.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={forcedEnPassantAtom} />
                </Group>
              </Tabs.Panel>

              <Tabs.Panel value="report">
                <Title order={1} fw={500} className={classes.title}>
                  {t("Settings.OpeningReport")}
                </Title>
                <Text size="xs" c="dimmed" mt={3} mb="lg">
                  {t("Settings.OpeningReport.Desc")}
                </Text>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.OpeningReport.PercentCoverage")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.OpeningReport.PercentCoverage.Desc")}
                    </Text>
                  </div>
                  <SettingsNumberInput atom={percentageCoverageAtom} min={50} max={100} step={1} />
                </Group>

                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.OpeningReport.MinGames")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.OpeningReport.MinGames.Desc")}
                    </Text>
                  </div>
                  <SettingsNumberInput atom={minimumGamesAtom} min={0} step={1} />
                </Group>
              </Tabs.Panel>

              <Tabs.Panel value="appearance">
                <Title order={1} fw={500} className={classes.title}>
                  {t("Settings.Appearance")}
                </Title>
                <Text size="xs" c="dimmed" mt={3} mb="lg">
                  {t("Settings.Appearance.Desc")}
                </Text>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Appearance.Theme")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Appearance.Theme.Desc")}
                    </Text>
                  </div>
                  <ThemeButton />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Appearance.Language")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Appearance.Language.Desc")}
                    </Text>
                  </div>
                  <Select
                    allowDeselect={false}
                    data={[
                      {
                        value: "am_AM",
                        label: "Armenian",
                      },
                      {
                        value: "be_BY",
                        label: "Belarusian",
                      },
                      {
                        value: "zh_CN",
                        label: "Chinese",
                      },
                      {
                        value: "en_US",
                        label: "English",
                      },
                      {
                        value: "fr_FR",
                        label: "Français",
                      },
                      {
                        value: "pl_PL",
                        label: "Polish",
                      },
                      {
                        value: "nb_NO",
                        label: "Norsk bokmål",
                      },
                      {
                        value: "pt_PT",
                        label: "Portuguese",
                      },
                      {
                        value: "ru_RU",
                        label: "Russian",
                      },
                      {
                        value: "es_ES",
                        label: "Spanish",
                      },
                      {
                        value: "it_IT",
                        label: "Italian",
                      },
                      {
                        value: "uk_UA",
                        label: "Ukrainian",
                      },
                      {
                        value: "tr_TR",
                        label: "Türkçe",
                      },
                    ]}
                    value={i18n.language}
                    onChange={(val) => {
                      i18n.changeLanguage(val || "en_US");
                      localStorage.setItem("lang", val || "en_US");
                    }}
                  />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Appearance.TitleBar")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Appearance.TitleBar.Desc")}
                    </Text>
                  </div>
                  <Select
                    allowDeselect={false}
                    data={["Native", "Custom"]}
                    value={isNative ? "Native" : "Custom"}
                    onChange={(val) => {
                      setIsNative(val === "Native");
                    }}
                  />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Appearance.hideDashboardOnStartup")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Appearance.hideDashboardOnStartup.Desc")}
                    </Text>
                  </div>
                  <SettingsSwitch atom={hideDashboardOnStartupAtom} />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Appearance.FontSize")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Appearance.FontSize.Desc")}
                    </Text>
                  </div>
                  <FontSizeSlider />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Appearance.PieceSet")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Appearance.PieceSet.Desc")}
                    </Text>
                  </div>
                  <PiecesSelect />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Appearance.BoardImage")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Appearance.BoardImage.Desc")}
                    </Text>
                  </div>
                  <BoardSelect />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Appearance.AccentColor")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Appearance.AccentColor.Desc")}
                    </Text>
                  </div>
                  <div style={{ width: 200 }}>
                    <ColorControl />
                  </div>
                </Group>
              </Tabs.Panel>

              <Tabs.Panel value="sound">
                <Title order={1} fw={500} className={classes.title}>
                  {t("Settings.Sound")}
                </Title>
                <Text size="xs" c="dimmed" mt={3} mb="lg">
                  {t("Settings.Sound.Desc")}
                </Text>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Sound.Volume")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Sound.Volume.Desc")}
                    </Text>
                  </div>
                  <VolumeSlider />
                </Group>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Sound.Collection")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Sound.Collection.Desc")}
                    </Text>
                  </div>
                  <SoundSelect />
                </Group>
              </Tabs.Panel>

              <Tabs.Panel value="directories">
                <Title order={1} fw={500} className={classes.title}>
                  {t("Settings.Directories")}
                </Title>
                <Text size="xs" c="dimmed" mt={3} mb="lg">
                  {t("Settings.Directories.Desc")}
                </Text>
                <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
                  <div data-searchable>
                    <Text>{t("Settings.Directories.Files")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("Settings.Directories.Files.Desc")}
                    </Text>
                  </div>
                  <FileInput
                    onClick={async () => {
                      const selected = await open({
                        multiple: false,
                        directory: true,
                      });
                      if (!selected || typeof selected !== "string") return;
                      setFilesDirectory(selected);
                    }}
                    filename={filesDirectory || null}
                  />
                </Group>
              </Tabs.Panel>
            </Card>
          </ScrollArea>
        </Stack>
      </Tabs>
    </Box>
  );
}
