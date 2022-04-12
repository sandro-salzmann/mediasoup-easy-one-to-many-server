import { Consumer } from 'mediasoup/node/lib/Consumer';
import { Producer } from 'mediasoup/node/lib/Producer';
import { Router } from 'mediasoup/node/lib/Router';
import { RtpCapabilities } from 'mediasoup/node/lib/RtpParameters';
import { Transport } from 'mediasoup/node/lib/Transport';

export const createConsumer = async (
  mediasoupRouter: Router,
  producer: Producer,
  consumerTransport: Transport,
  rtpCapabilities: RtpCapabilities,
) => {
  let consumer: Consumer;
  if (
    !mediasoupRouter.canConsume({
      producerId: producer.id,
      rtpCapabilities,
    })
  ) {
    return false;
  }
  consumer = await consumerTransport.consume({
    producerId: producer.id,
    rtpCapabilities,
    paused: producer.kind === 'video',
  });

  if (consumer.type === 'simulcast') {
    await consumer.setPreferredLayers({ spatialLayer: 2, temporalLayer: 2 });
  }

  return {
    params: {
      producerId: producer.id,
      id: consumer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      type: consumer.type,
      producerPaused: consumer.producerPaused,
    },
    createdConsumer: consumer,
  };
};
