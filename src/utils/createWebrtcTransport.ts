import { Router } from 'mediasoup/node/lib/Router';
import { config } from '../config';
import { MediasoupRouterOptions } from '../router';

export const createWebrtcTransport = async (mediasoupRouter: Router, options: MediasoupRouterOptions) => {
  let { maxIncomeBitrate, initialAvailableOutgoingBitrate, listenIps } =
    config.webRtcTransport;

  if (options.maxIncomeBitrate) {
    maxIncomeBitrate = options.maxIncomeBitrate
  }
  if (options.initialAvailableOutgoingBitrate) {
    initialAvailableOutgoingBitrate = options.initialAvailableOutgoingBitrate
  }
  if (options.listenIps) {
    listenIps = options.listenIps
  }

  const transport = await mediasoupRouter.createWebRtcTransport({
    listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate,
  });

  if (maxIncomeBitrate) {
    try {
      await transport.setMaxIncomingBitrate(maxIncomeBitrate);
    } catch (error) {
      console.log(error);
    }
  }

  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    },
  };
};
