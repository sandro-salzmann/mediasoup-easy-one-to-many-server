import { Router } from 'mediasoup/node/lib/Router';
import { config } from '../config';

export const createWebrtcTransport = async (mediasoupRouter: Router) => {
  const { maxIncomeBitrate, initialAvailableOutgoingBitrate, listenIps } =
    config.webRtcTransport;

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
