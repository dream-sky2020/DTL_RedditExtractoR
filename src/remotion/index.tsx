import { registerRoot } from 'remotion';
import { MyVideo } from './MyVideo';

registerRoot(() => {
  return (
    <>
      <Composition
        id="MyVideo"
        component={MyVideo}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Hello Reddit!',
        }}
      />
    </>
  );
});

import { Composition } from 'remotion';
