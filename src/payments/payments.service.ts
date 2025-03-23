import { Injectable } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.STRIPE_SECRET);

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items, orderId } = paymentSessionDto;

    const lineItems = items.map((item) => {
      return {
        price_data: {
          currency: currency,
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const session = await this.stripe.checkout.sessions.create({
      // colocar aqui el id de order
      payment_intent_data: {
        metadata: {
          order_id: orderId,
        },
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: envs.STRIPE_SUCCESS_URL,
      cancel_url: envs.STRIPE_CANCEL_URL,
    });

    return session;
  }

  async stripeWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;
    // Testing
    // const endpointSecret =
    //   'whsec_74001e0110253fd3065bf96e1dc05ae6227448972bd526f5007819b9f28234bd';

    const endpointSecret = envs.STRIPE_ENDPOINTSECRET;

    try {
      event = this.stripe.webhooks.constructEvent(
        req['rawBody'],
        sig,
        endpointSecret,
      );
    } catch (error) {
      res.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }

    console.log(event);

    switch (event.type) {
      case 'charge.succeeded':
        const chargeSucceeded = event.data.object;

        console.log(chargeSucceeded.metadata);

        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
        break;
    }
    return res.status(200).json({ sig });
  }
}
