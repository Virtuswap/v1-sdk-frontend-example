import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Web3Modal } from '@/providers';
import { NextUIProvider } from '@nextui-org/react';
import { Layout } from '@/components/Layout';

export default function App({ Component, pageProps }: AppProps) {
  return (
      <NextUIProvider>
          <Web3Modal>
              <Layout>
                  <Component {...pageProps} />
              </Layout>
          </Web3Modal>
      </NextUIProvider>
  );
}
