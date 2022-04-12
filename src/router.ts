import http from 'http';
import { Consumer, ConsumerType } from 'mediasoup/node/lib/Consumer';
import { Producer } from 'mediasoup/node/lib/Producer';
import { Router } from 'mediasoup/node/lib/Router';
import {
  MediaKind,
  RtpCapabilities,
  RtpParameters
} from 'mediasoup/node/lib/RtpParameters';
import { Transport, TransportListenIp } from 'mediasoup/node/lib/Transport';
import { DtlsParameters, IceCandidate, IceParameters } from 'mediasoup/node/lib/WebRtcTransport';
import { WorkerLogLevel } from 'mediasoup/node/lib/Worker';
import { Server } from 'socket.io';
import { createConsumer } from './utils/createConsumer';
import { createRouter } from './utils/createRouter';
import { createWebrtcTransport } from './utils/createWebrtcTransport';

let mediasoupRouter: Router;
let producerTransport: Transport;
let producer: Producer;

type StaticOrigin = boolean | string | RegExp | (boolean | string | RegExp)[];

type CustomOrigin = (requestOrigin: string | undefined, callback: (err: Error | null, origin?: StaticOrigin) => void) => void;

export type MediasoupRouterOptions = {
  allowedCorsOrigin?: StaticOrigin | CustomOrigin | undefined,
  logLevel?: WorkerLogLevel | undefined,
  rtcMinPort?: number | undefined,
  rtcMaxPort?: number | undefined,
  maxIncomeBitrate?: number | undefined,
  initialAvailableOutgoingBitrate?: number | undefined,
  listenIps?: TransportListenIp[] | undefined
}

export const createMediasoupRouter = async (server: http.Server, options: MediasoupRouterOptions) => {
  try {
    mediasoupRouter = await createRouter(options);
  } catch (error) {
    throw error;
  }
  const io = new Server(server, {
    cors: {
      origin: options.allowedCorsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  io.of('/mediasoup').on('connection', (socket) => {
    let consumerTransport: Transport;
    let consumer: Consumer;

    // router
    const onRouterRtpCapabilities = (
      callback: (rtpCapabilities: RtpCapabilities) => void,
    ) => {
      callback(mediasoupRouter.rtpCapabilities);
    };
    socket.on('getRouterRtpCapabilities', onRouterRtpCapabilities);

    // producer
    const onCreateProducerTransport = async (
      callback: (params: {
        ok: boolean,
        params?: {
          id: string;
          iceParameters: IceParameters;
          iceCandidates: IceCandidate[];
          dtlsParameters: DtlsParameters;
        },
        msg?: string,
        error?: any
      }) => void,
    ) => {
      try {
        const { params, transport } = await createWebrtcTransport(
          mediasoupRouter, options
        );

        producerTransport = transport;
        callback({ ok: true, params });
      } catch (error) {
        console.error(error);
        callback({ ok: false, msg: 'Failed to create transport.', error });
      }
    };
    const onConnectProducerTransport = async (
      dtlsParameters: DtlsParameters,
      callback: () => void,
    ) => {
      await producerTransport.connect({ dtlsParameters });
      callback();
    };
    const onProduce = async (
      event: { kind: MediaKind; rtpParameters: RtpParameters },
      callback: (producerId: string) => void,
    ) => {
      producer = await producerTransport.produce(event);
      callback(producer.id);
      io.emit('newProducer'); // broadcast to all that there's a new producer
    };
    socket.on('createProducerTransport', onCreateProducerTransport);
    socket.on('connectProducerTransport', onConnectProducerTransport);
    socket.on('produce', onProduce);

    // consumer
    const onCreateConsumerTransport = async (
      callback: (params: {
        ok: boolean,
        params?: {
          id: string;
          iceParameters: IceParameters;
          iceCandidates: IceCandidate[];
          dtlsParameters: DtlsParameters;
        },
        msg?: string,
        error?: any
      }) => void,
    ) => {
      try {
        const { params, transport } = await createWebrtcTransport(
          mediasoupRouter, options
        );

        consumerTransport = transport;
        callback({ ok: true, params });
      } catch (error) {
        console.error(error);
        callback({ ok: false, msg: 'Failed to create transport.', error });
      }
    };
    const onConnectConsumerTransport = async (
      dtlsParameters: DtlsParameters,
      callback: () => void,
    ) => {
      await consumerTransport.connect({ dtlsParameters });
      callback();
    };
    const onResume = async (callback: () => void) => {
      await consumer.resume();
      callback();
    };
    const onConsume = async (
      rtpCapabilities: RtpCapabilities,
      callback: (res: {
        ok: boolean,
        params?: {
          producerId: string;
          id: string;
          kind: MediaKind;
          rtpParameters: RtpParameters;
          type: ConsumerType;
          producerPaused: boolean;
        },
        msg?: string,
        error?: any
      }) => void,
    ) => {
      try {
        const requestedConsumer = await createConsumer(
          mediasoupRouter,
          producer,
          consumerTransport,
          rtpCapabilities,
        );
        if (!requestedConsumer) {
          throw 'Cannot consume right now.';
        } else {
          consumer = requestedConsumer.createdConsumer;
          callback({ ok: true, params: requestedConsumer.params });
        }
      } catch (error) {
        console.error(error);
        callback({ ok: false, msg: 'Failed to consume', error });
      }
    };
    socket.on('createConsumerTransport', onCreateConsumerTransport);
    socket.on('connectConsumerTransport', onConnectConsumerTransport);
    socket.on('resume', onResume);
    socket.on('consume', onConsume);
  });
};
