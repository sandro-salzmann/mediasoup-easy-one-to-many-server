import http from 'http';
import { Consumer, ConsumerType } from 'mediasoup/node/lib/Consumer';
import { Producer } from 'mediasoup/node/lib/Producer';
import { Router } from 'mediasoup/node/lib/Router';
import {
  MediaKind,
  RtpCapabilities,
  RtpParameters
} from 'mediasoup/node/lib/RtpParameters';
import { Transport } from 'mediasoup/node/lib/Transport';
import { DtlsParameters, IceCandidate, IceParameters } from 'mediasoup/node/lib/WebRtcTransport';
import { Server } from 'socket.io';
import { createConsumer } from './utils/createConsumer';
import { createWebrtcTransport } from './utils/createWebrtcTransport';
import { createRouter } from './utils/createRouter';

let mediasoupRouter: Router;
let producerTransport: Transport;
let producer: Producer;

export const createMediasoupRouter = async (server: http.Server) => {
  try {
    mediasoupRouter = await createRouter();
  } catch (error) {
    throw error;
  }
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:8080'], // just for testing purposes
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
          mediasoupRouter,
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
          mediasoupRouter,
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
