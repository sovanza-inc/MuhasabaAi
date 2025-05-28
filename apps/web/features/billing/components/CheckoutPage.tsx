import React from 'react';
import {
  Box,
  Container,
  Stack,
  Text,
  useToast,
  Button,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { api } from '#lib/trpc/react';
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace';
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutPageProps {
  price: number;
  currency: string;
}

const CheckoutForm = ({ planId }: { planId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = React.useState(false);
  const [workspace] = useCurrentWorkspace();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/${workspace.slug}?success=true`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: 'Payment failed',
          description: error.message,
          status: 'error',
        });
      } else if (paymentIntent.status === 'succeeded') {
        // Create subscription in database
        try {
          await utils.workspaces.invalidate();
          router.push(`/${workspace.slug}`);
          toast({
            title: 'Payment successful',
            description: 'Your subscription has been activated.',
            status: 'success',
          });
        } catch (error) {
          console.error('Failed to update subscription:', error);
          toast({
            title: 'Error updating subscription',
            description: 'Payment successful but failed to update subscription. Please contact support.',
            status: 'error',
          });
        }
      }
    } catch (e) {
      const error = e as Error;
      toast({
        title: 'Payment failed',
        description: error.message,
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={6}>
        <Box border="1px" borderColor="gray.200" rounded="md" p={4}>
          <PaymentElement />
        </Box>
        <Button
          type="submit"
          colorScheme="blue"
          size="lg"
          width="full"
          isLoading={isLoading}
          loadingText="Processing payment..."
          isDisabled={!stripe || !elements}
        >
          Pay Now
        </Button>
      </Stack>
    </form>
  );
};

export const CheckoutPage = ({
  price,
  currency,
}: CheckoutPageProps) => {
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [workspace] = useCurrentWorkspace();
  const toast = useToast();

  const createPaymentIntent = api.billing.createPaymentIntent.useMutation({
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
      });
    },
  });

  React.useEffect(() => {
    if (workspace) {
      createPaymentIntent.mutate({
        workspaceId: workspace.id,
        planId: '',
        amount: price,
        currency,
      });
    }
  }, [workspace, price, currency]);

  if (!clientSecret) {
    return (
      <Container maxW="container.sm" py={8}>
        <Text>Loading payment form...</Text>
      </Container>
    );
  }

  return (
    <Container maxW="container.sm" py={8}>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm planId="" />
      </Elements>
    </Container>
  );
}; 