import React from "react";
import { Composition } from "remotion";
import { Episode } from "./Episode";
import { FPS, totalFrames, type Timeline } from "./schema";
import { Slideshow } from "./Slideshow";
import { slideTotalFrames, type SlideTimeline } from "./slides";

const EMPTY: Timeline = { title: "", fps: FPS, format: "landscape", mediaBase: "", music: null, cast: [], scenes: [] };
const EMPTY_SLIDES: SlideTimeline = { title: "", fps: FPS, format: "landscape", mediaBase: "", music: null, musicVolume: 0.12, captions: "bold", scenes: [] };

// The app's render step passes the timeline as input props.
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Episode"
      component={Episode}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={FPS}
      defaultProps={{ timeline: EMPTY }}
      calculateMetadata={({ props }) => {
        const vertical = props.timeline.format === "vertical";
        return {
          durationInFrames: Math.max(1, totalFrames(props.timeline)),
          width: vertical ? 1080 : 1920,
          height: vertical ? 1920 : 1080,
        };
      }}
    />
    <Composition
      id="Slideshow"
      component={Slideshow}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={FPS}
      defaultProps={{ timeline: EMPTY_SLIDES }}
      calculateMetadata={({ props }) => {
        const vertical = props.timeline.format === "vertical";
        return {
          durationInFrames: Math.max(1, slideTotalFrames(props.timeline)),
          width: vertical ? 1080 : 1920,
          height: vertical ? 1920 : 1080,
        };
      }}
    />
  </>
);
