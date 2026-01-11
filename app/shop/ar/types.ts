import { DoorStructure, FrameColor, GlassType, DesignType } from "@/app/lib/doorCatalog";

export type { DoorStructure, FrameColor, GlassType, DesignType };

export type DoorConfig = {
    structure: DoorStructure;
    frameColor: FrameColor;
    glassType: GlassType;
    designType: DesignType;
    // ... any AR specific config
};

