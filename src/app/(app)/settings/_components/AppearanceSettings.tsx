import ThemePicker from "@/components/blocks/theme-picker";

const AppearanceSettings = () => {
  return (
    <div className="my-4 space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Pick a reading surface for day and for night, then mix in an accent
          colour. Auto follows your device between the two.
        </p>
      </div>
      <ThemePicker className="max-w-md" />
    </div>
  );
};

export default AppearanceSettings;
