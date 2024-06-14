import React, { ReactNode } from 'react';
import Head from 'next/head';
import { Plus_Jakarta_Sans } from 'next/font/google';

const font = Plus_Jakarta_Sans({ subsets: ['latin'] });

const title = 'VirtuSwap SDK v1 Example';
const description = 'VirtuSwap v1 SDK frontend integration example';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta name="description" content={description}/>
        <meta property="og:title" content={title}/>
        <meta property="og:description" content={description}/>
        <link rel="icon" href="/v1-sdk-frontend-example/favicon.svg"/>
        <link rel="shortcut icon" href="/v1-sdk-frontend-example/favicon.ico"/>
      </Head>
      <div className="flex flex-col w-screen h-screen p-4 lg:p-8">
        <div className="flex flex-row self-end">
          <div className="flex flex-col gap-2">
            <w3m-button />
          </div>
        </div>
        <main className={`flex flex-col flex-1 ${font.className}`}>{children}</main>
      </div>
    </>
  );
}
