import * as mediasoup from 'mediasoup';
import { config } from '../config';
import { MediasoupRouterOptions } from '../router';

export const createRouter = async (options: MediasoupRouterOptions) => {
  const worker = await mediasoup.createWorker({
    logLevel: options.logLevel || config.mediasoup.worker.logLevel,
    logTags: config.mediasoup.worker.logTags,
    rtcMinPort: options.rtcMinPort || config.mediasoup.worker.rtcMinPort,
    rtcMaxPort: options.rtcMaxPort || config.mediasoup.worker.rtcMaxPort,
  });

  worker.on('died', () => {
    console.error('mediasoup worker died, exiting in 2 seconds ...');
    setTimeout(() => {
      process.exit(1);
    }, 2000);
  });

  const mediaCodecs = config.router.mediaCodes;
  const mediasoupRouter = await worker.createRouter({ mediaCodecs });
  return mediasoupRouter;
};
