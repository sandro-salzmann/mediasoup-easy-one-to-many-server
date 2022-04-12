import * as mediasoup from 'mediasoup';
import { config } from '../config';

export const createRouter = async () => {
  const worker = await mediasoup.createWorker({
    logLevel: config.mediasoup.worker.logLevel,
    logTags: config.mediasoup.worker.logTags,
    rtcMinPort: config.mediasoup.worker.rtcMinPort,
    rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
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
