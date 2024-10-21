"use client";

import { Button } from "@/components/ui/button";
import { updateEntitiesScript } from "./actions";

const AdvancedSettings = () => {
  return (
    <div className="grid gap-6">
      <div className="border rounded-sm p-4">
        <div>
          <h3 className="text-lg font-medium">Advanced Settings</h3>
          <p className="text-muted-foreground text-sm">
            Various app settings for Content and UI.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4">
          <div>
            <p>Run Script to adjust Entities: </p>
            <Button onClick={() => updateEntitiesScript()}>Run Script</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSettings;
