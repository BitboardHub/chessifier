import { Box, Card, Group, ScrollArea, Select, Stack, Tabs, Text, TextInput, Title } from "@mantine/core";
import { IconBook, IconBrush, IconChess, IconFlag, IconFolder, IconMouse, IconVolume } from "@tabler/icons-react";
import { useLoaderData } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-dialog";
import { useAtom } from "jotai";
import { useMemo, useState } from "react";
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
  showConsecutiveArrowsAtom,
  showCoordinatesAtom,
  showDestsAtom,
  snapArrowsAtom,
  spellCheckAtom,
  storedDocumentDirAtom,
} from "@/state/atoms";
import { ThemeSettings } from "@/themes";
import { computedThemeAtom } from "@/themes/state";
import type { ThemeDefinition } from "@/themes/types";
import BoardSelect from "./components/BoardSelect";
import ColorControl from "./components/ColorControl";
import FontSizeSlider from "./components/FontSizeSlider";
import PiecesSelect from "./components/PiecesSelect";
import SettingsNumberInput from "./components/SettingsNumberInput";
import SettingsSwitch from "./components/SettingsSwitch";
import SoundSelect from "./components/SoundSelect";
import TelemetrySettings from "./components/TelemetrySettings";
import VolumeSlider from "./components/VolumeSlider";
import * as classes from "./SettingsPage.css";

interface SettingItem {
  id: string;
  title: string;
  description: string;
  tab: string;
  component: React.ReactNode;
}

export default function Page() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");

  const [isNative, setIsNative] = useAtom(nativeBarAtom);
  const {
    dirs: { documentDir },
  } = useLoaderData({ from: "/settings" });
  let [filesDirectory, setFilesDirectory] = useAtom(storedDocumentDirAtom);
  filesDirectory = filesDirectory || documentDir;

  const [moveMethod, setMoveMethod] = useAtom(moveMethodAtom);
  const [moveNotationType, setMoveNotationType] = useAtom(moveNotationTypeAtom);
  const [computedTheme] = useAtom<ThemeDefinition | null>(computedThemeAtom);

  const allSettings = useMemo((): SettingItem[] => {
    const items: SettingItem[] = [
      {
        id: "piece-dest",
        title: t("Settings.PieceDest"),
        description: t("Settings.PieceDest.Desc"),
        tab: "board",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.PieceDest")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.PieceDest.Desc")}
              </Text>
            </div>
            <SettingsSwitch atom={showDestsAtom} />
          </Group>
        ),
      },
      {
        id: "move-notation",
        title: "Move notation",
        description: "Choose how to display pieces in notation",
        tab: "board",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
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
        ),
      },
      {
        id: "move-pieces",
        title: "Ways to Move Pieces",
        description: "Move pieces by dragging, clicking, or both",
        tab: "board",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
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
        ),
      },
      {
        id: "snap-arrows",
        title: t("Settings.SnapArrows"),
        description: t("Settings.SnapArrows.Desc"),
        tab: "board",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.SnapArrows")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.SnapArrows.Desc")}
              </Text>
            </div>
            <SettingsSwitch atom={snapArrowsAtom} />
          </Group>
        ),
      },
      {
        id: "consecutive-arrows",
        title: t("Settings.ConsecutiveArrows"),
        description: t("Settings.ConsecutiveArrows.Desc"),
        tab: "board",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.ConsecutiveArrows")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.ConsecutiveArrows.Desc")}
              </Text>
            </div>
            <SettingsSwitch atom={showConsecutiveArrowsAtom} />
          </Group>
        ),
      },
      {
        id: "erase-drawables",
        title: t("Settings.EraseDrawablesOnClick"),
        description: t("Settings.EraseDrawablesOnClick.Desc"),
        tab: "board",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.EraseDrawablesOnClick")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.EraseDrawablesOnClick.Desc")}
              </Text>
            </div>
            <SettingsSwitch atom={eraseDrawablesOnClickAtom} />
          </Group>
        ),
      },
      {
        id: "auto-promotion",
        title: t("Settings.AutoPromition"),
        description: t("Settings.AutoPromition.Desc"),
        tab: "board",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.AutoPromition")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.AutoPromition.Desc")}
              </Text>
            </div>
            <SettingsSwitch atom={autoPromoteAtom} />
          </Group>
        ),
      },
      {
        id: "coordinates",
        title: t("Settings.Coordinates"),
        description: t("Settings.Coordinates.Desc"),
        tab: "board",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.Coordinates")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.Coordinates.Desc")}
              </Text>
            </div>
            <SettingsSwitch atom={showCoordinatesAtom} />
          </Group>
        ),
      },
      {
        id: "auto-save",
        title: t("Settings.AutoSave"),
        description: t("Settings.AutoSave.Desc"),
        tab: "board",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.AutoSave")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.AutoSave.Desc")}
              </Text>
            </div>
            <SettingsSwitch atom={autoSaveAtom} />
          </Group>
        ),
      },
      {
        id: "preview-board",
        title: t("Settings.PreviewBoard"),
        description: t("Settings.PreviewBoard.Desc"),
        tab: "board",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.PreviewBoard")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.PreviewBoard.Desc")}
              </Text>
            </div>
            <SettingsSwitch atom={previewBoardOnHoverAtom} />
          </Group>
        ),
      },
      {
        id: "board-scroll",
        title: t("Settings.ScrollThroughMoves"),
        description: t("Settings.ScrollThroughMoves.Desc"),
        tab: "board",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.ScrollThroughMoves")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.ScrollThroughMoves.Desc")}
              </Text>
            </div>
            <SettingsSwitch atom={enableBoardScrollAtom} />
          </Group>
        ),
      },
      {
        id: "text-input",
        title: t("Settings.Inputs.TextInput"),
        description: t("Settings.Inputs.TextInput.Desc"),
        tab: "inputs",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.Inputs.TextInput")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.Inputs.TextInput.Desc")}
              </Text>
            </div>
            <SettingsSwitch atom={moveInputAtom} />
          </Group>
        ),
      },
      {
        id: "spell-check",
        title: t("Settings.Inputs.SpellCheck"),
        description: t("Settings.Inputs.SpellCheck.Desc"),
        tab: "inputs",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.Inputs.SpellCheck")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.Inputs.SpellCheck.Desc")}
              </Text>
            </div>
            <SettingsSwitch atom={spellCheckAtom} />
          </Group>
        ),
      },
      {
        id: "forced-en-passant",
        title: t("Settings.Anarchy.ForcedEnPassant"),
        description: t("Settings.Anarchy.ForcedEnPassant.Desc"),
        tab: "anarchy",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.Anarchy.ForcedEnPassant")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.Anarchy.ForcedEnPassant.Desc")}
              </Text>
            </div>
            <SettingsSwitch atom={forcedEnPassantAtom} />
          </Group>
        ),
      },
      {
        id: "percent-coverage",
        title: t("Settings.OpeningReport.PercentCoverage"),
        description: t("Settings.OpeningReport.PercentCoverage.Desc"),
        tab: "report",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.OpeningReport.PercentCoverage")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.OpeningReport.PercentCoverage.Desc")}
              </Text>
            </div>
            <SettingsNumberInput atom={percentageCoverageAtom} min={50} max={100} step={1} />
          </Group>
        ),
      },
      {
        id: "min-games",
        title: t("Settings.OpeningReport.MinGames"),
        description: t("Settings.OpeningReport.MinGames.Desc"),
        tab: "report",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.OpeningReport.MinGames")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.OpeningReport.MinGames.Desc")}
              </Text>
            </div>
            <SettingsNumberInput atom={minimumGamesAtom} min={0} step={1} />
          </Group>
        ),
      },
      {
        id: "language",
        title: t("Settings.Appearance.Language"),
        description: t("Settings.Appearance.Language.Desc"),
        tab: "appearance",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
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
        ),
      },
      {
        id: "title-bar",
        title: t("Settings.Appearance.TitleBar"),
        description: t("Settings.Appearance.TitleBar.Desc"),
        tab: "appearance",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
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
        ),
      },
      {
        id: "hide-dashboard",
        title: t("Settings.Appearance.hideDashboardOnStartup"),
        description: t("Settings.Appearance.hideDashboardOnStartup.Desc"),
        tab: "appearance",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.Appearance.hideDashboardOnStartup")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.Appearance.hideDashboardOnStartup.Desc")}
              </Text>
            </div>
            <SettingsSwitch atom={hideDashboardOnStartupAtom} />
          </Group>
        ),
      },
      {
        id: "font-size",
        title: t("Settings.Appearance.FontSize"),
        description: t("Settings.Appearance.FontSize.Desc"),
        tab: "appearance",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.Appearance.FontSize")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.Appearance.FontSize.Desc")}
              </Text>
            </div>
            <FontSizeSlider />
          </Group>
        ),
      },
      {
        id: "piece-set",
        title: t("Settings.Appearance.PieceSet"),
        description: t("Settings.Appearance.PieceSet.Desc"),
        tab: "appearance",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.Appearance.PieceSet")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.Appearance.PieceSet.Desc")}
              </Text>
            </div>
            <PiecesSelect />
          </Group>
        ),
      },
      {
        id: "board-image",
        title: t("Settings.Appearance.BoardImage"),
        description: t("Settings.Appearance.BoardImage.Desc"),
        tab: "appearance",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.Appearance.BoardImage")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.Appearance.BoardImage.Desc")}
              </Text>
            </div>
            <BoardSelect />
          </Group>
        ),
      },
      {
        id: "theme",
        title: t("Settings.Appearance.Theme"),
        description: t("Settings.Appearance.Theme.Desc"),
        tab: "appearance",
        component: <ThemeSettings />,
      },
      {
        id: "volume",
        title: t("Settings.Sound.Volume"),
        description: t("Settings.Sound.Volume.Desc"),
        tab: "sound",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.Sound.Volume")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.Sound.Volume.Desc")}
              </Text>
            </div>
            <VolumeSlider />
          </Group>
        ),
      },
      {
        id: "sound-collection",
        title: t("Settings.Sound.Collection"),
        description: t("Settings.Sound.Collection.Desc"),
        tab: "sound",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
              <Text>{t("Settings.Sound.Collection")}</Text>
              <Text size="xs" c="dimmed">
                {t("Settings.Sound.Collection.Desc")}
              </Text>
            </div>
            <SoundSelect />
          </Group>
        ),
      },
      {
        id: "files-directory",
        title: t("Settings.Directories.Files"),
        description: t("Settings.Directories.Files.Desc"),
        tab: "directories",
        component: (
          <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
            <div>
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
        ),
      },
      {
        id: "telemetry",
        title: "Telemetry",
        description: "Help improve Pawn Appétit by sharing anonymous usage data",
        tab: "directories",
        component: <TelemetrySettings className={classes.item} />,
      },
      // Insert accent-color setting conditionally so it appears near other appearance controls
    ];

    if (computedTheme) {
      const themeName = computedTheme.name;
      const isClassic = themeName === "classic-light" || themeName === "classic-dark";
      if (isClassic) {
        const accentItem: SettingItem = {
          id: "accent-color",
          title: t("Settings.Appearance.AccentColor"),
          description: t("Settings.Appearance.AccentColor.Desc"),
          tab: "appearance",
          component: (
            <Group justify="space-between" wrap="nowrap" gap="xl" className={classes.item}>
              <div>
                <Text>{t("Settings.Appearance.AccentColor")}</Text>
                <Text size="xs" c="dimmed">
                  {t("Settings.Appearance.AccentColor.Desc")}
                </Text>
              </div>
              <div style={{ width: 200 }}>
                <ColorControl />
              </div>
            </Group>
          ),
        };

        const themeIdx = items.findIndex((s) => s.id === "theme");
        if (themeIdx >= 0) {
          items.splice(themeIdx + 1, 0, accentItem);
        } else {
          items.push(accentItem);
        }
      }
    }

    return items;
  }, [
    t,
    i18n.language,
    i18n.changeLanguage,
    isNative,
    setIsNative,
    moveMethod,
    setMoveMethod,
    moveNotationType,
    setMoveNotationType,
    filesDirectory,
    setFilesDirectory,
    computedTheme,
  ]);

  const filteredSettings = useMemo(() => {
    if (!search.trim()) return null;

    const searchTerm = search.toLowerCase();
    return allSettings.filter(
      (setting) =>
        setting.title.toLowerCase().includes(searchTerm) || setting.description.toLowerCase().includes(searchTerm),
    );
  }, [search, allSettings]);

  const settingsByTab = useMemo(() => {
    const grouped: Record<string, SettingItem[]> = {};
    allSettings.forEach((setting) => {
      if (!grouped[setting.tab]) {
        grouped[setting.tab] = [];
      }
      grouped[setting.tab].push(setting);
    });
    return grouped;
  }, [allSettings]);

  const filteredSettingsByTab = useMemo(() => {
    if (!filteredSettings) return {};

    const grouped: Record<string, SettingItem[]> = {};
    filteredSettings.forEach((setting) => {
      if (!grouped[setting.tab]) {
        grouped[setting.tab] = [];
      }
      grouped[setting.tab].push(setting);
    });
    return grouped;
  }, [filteredSettings]);

  const tabInfo = {
    board: { title: t("Settings.Board"), desc: t("Settings.Board.Desc") },
    inputs: { title: t("Settings.Inputs"), desc: t("Settings.Inputs.Desc") },
    anarchy: { title: t("Settings.Anarchy"), desc: t("Settings.Anarchy.Desc") },
    report: { title: t("Settings.OpeningReport"), desc: t("Settings.OpeningReport.Desc") },
    appearance: { title: t("Settings.Appearance"), desc: t("Settings.Appearance.Desc") },
    sound: { title: t("Settings.Sound"), desc: t("Settings.Sound.Desc") },
    directories: { title: t("Settings.Directories"), desc: t("Settings.Directories.Desc") },
  };

  const renderTabContent = (tabId: string, settings: SettingItem[]) => (
    <>
      <Title order={1} fw={500} className={classes.title}>
        {tabInfo[tabId as keyof typeof tabInfo]?.title}
      </Title>
      <Text size="xs" c="dimmed" mt={3} mb="lg">
        {tabInfo[tabId as keyof typeof tabInfo]?.desc}
      </Text>
      {settings.map((setting) => (
        <div key={setting.id}>{setting.component}</div>
      ))}
    </>
  );

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
      {filteredSettings ? (
        <Box h="calc(100vh - 170px)" style={{ overflow: "hidden" }}>
          <ScrollArea h="100%">
            <Card className={classes.card} w="100%" pl="lg" pr="xl">
              {Object.entries(filteredSettingsByTab).map(([tabId, settings]) => (
                <div key={tabId}>
                  <Title order={2} fw={500} mt="xl" mb="md">
                    {tabInfo[tabId as keyof typeof tabInfo]?.title} ({settings.length} result
                    {settings.length !== 1 ? "s" : ""})
                  </Title>
                  {settings.map((setting) => (
                    <div key={setting.id}>{setting.component}</div>
                  ))}
                </div>
              ))}
              {filteredSettings.length === 0 && (
                <Text c="dimmed" ta="center" py="xl">
                  No settings found for "{search}"
                </Text>
              )}
            </Card>
          </ScrollArea>
        </Box>
      ) : (
        <Tabs defaultValue="board" orientation="vertical" h="100%">
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
                <Tabs.Panel value="board">{renderTabContent("board", settingsByTab.board || [])}</Tabs.Panel>

                <Tabs.Panel value="inputs">{renderTabContent("inputs", settingsByTab.inputs || [])}</Tabs.Panel>

                <Tabs.Panel value="anarchy">{renderTabContent("anarchy", settingsByTab.anarchy || [])}</Tabs.Panel>

                <Tabs.Panel value="report">{renderTabContent("report", settingsByTab.report || [])}</Tabs.Panel>

                <Tabs.Panel value="appearance">
                  {renderTabContent("appearance", settingsByTab.appearance || [])}
                </Tabs.Panel>

                <Tabs.Panel value="sound">{renderTabContent("sound", settingsByTab.sound || [])}</Tabs.Panel>

                <Tabs.Panel value="directories">
                  {renderTabContent("directories", settingsByTab.directories || [])}
                </Tabs.Panel>
              </Card>
            </ScrollArea>
          </Stack>
        </Tabs>
      )}
    </Box>
  );
}
