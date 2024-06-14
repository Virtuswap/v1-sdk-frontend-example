'use client';

import { ReactNode } from 'react';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5/react';
import { Plus_Jakarta_Sans } from 'next/font/google';

const font = Plus_Jakarta_Sans({ subsets: ['latin'] });

export const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!;

export const chains = [
    {
        chainId: 137,
        name: 'Polygon',
        currency: 'MATIC',
        explorerUrl: 'https://polygonscan.com',
        rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    },
    {
        chainId: 42161,
        name: 'Arbitrum',
        currency: 'ETH',
        explorerUrl: 'https://arbiscan.io',
        rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    },
];

const metadata = {
    name: 'VirtuSwap SDK v1 Example',
    description: 'VirtuSwap v1 SDK frontend integration example',
    url: 'https://Virtuswap.github.io/v1-sdk-frontend-example',
    icons: ['https://Virtuswap.github.io/v1-sdk-frontend-example/favicon.svg']
}

const ethersConfig = defaultConfig({
    metadata,
    rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    defaultChainId: 137,
})

createWeb3Modal({
    ethersConfig,
    chains,
    projectId,
    chainImages: {
        137: 'https://tokens-chains-logos.s3.amazonaws.com/chains/chain_137.svg',
        42161: 'https://tokens-chains-logos.s3.amazonaws.com/chains/chain_42161.svg',
    },
    themeVariables: {
        '--w3m-font-family': font.style.fontFamily,
        '--w3m-border-radius-master': '3px',
    },
    termsConditionsUrl: 'https://virtuswap.io/docs/tos.pdf',
    privacyPolicyUrl: 'https://virtuswap.io/docs/privacy.pdf',
})

export default function Web3Modal({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
