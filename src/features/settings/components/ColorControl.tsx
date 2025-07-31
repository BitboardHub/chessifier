import { CheckIcon, ColorSwatch, Group, Input, useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { useAtom } from "jotai";
import { primaryColorAtom } from "@/state/atoms";

export default function ColorControl() {
  const [primaryColor, setPrimaryColor] = useAtom(primaryColorAtom);
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const osColorScheme = useColorScheme();

  const colors = Object.keys(theme.colors).map((color) => (
    <ColorSwatch
      color={
        colorScheme === "dark" || (osColorScheme === "dark" && colorScheme === "auto")
          ? theme.colors[color][7]
          : theme.colors[color][5]
      }
      component="button"
      key={color}
      onClick={() => setPrimaryColor(color)}
      radius="sm"
      style={{
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color:
          colorScheme === "dark" || (osColorScheme === "dark" && colorScheme === "auto")
            ? theme.colors[color][2]
            : theme.white,
        flex: "1 0 calc(15% - 4px)",
      }}
    >
      {primaryColor === color && <CheckIcon width={12} height={12} />}
    </ColorSwatch>
  ));

  return (
    <Input.Wrapper labelElement="div">
      <Group gap={2}>{colors}</Group>
    </Input.Wrapper>
  );
}
