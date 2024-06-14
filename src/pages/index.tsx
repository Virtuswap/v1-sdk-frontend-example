import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Select, SelectItem, Input, Button } from '@nextui-org/react';
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers5/react';
import { useDebouncedCallback } from 'use-debounce';
import { ethers } from 'ethers';
import { Interface } from '@ethersproject/abi';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { Chain, Token, getAllTokens, Router, Route, chainInfo } from '@virtuswap/v1-sdk';
import { chains } from '@/providers/Web3Modal';
import { ERC20ABI, Multicall3ABI } from '@/abi';

const multicall3Address = '0xcA11bde05977b3631167028862bE2a173976CA11'; // https://www.multicall3.com/
const erc20Interface = new Interface(ERC20ABI);

export default function Home() {
    const { chainId, address: userAddress } = useWeb3ModalAccount();
    const { walletProvider } = useWeb3ModalProvider();
    const [isLoadingTokens, setIsLoadingTokens] = useState(false);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [isSwapping, setIsSwapping] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isExactInput, setIsExactInput] = useState(true);
    const [fromTokenAddress, setFromTokenAddress] = useState<string | undefined>();
    const [fromTokenAmount, setFromTokenAmount] = useState<string>('');
    const [toTokenAddress, setToTokenAddress] = useState<string | undefined>();
    const [toTokenAmount, setToTokenAmount] = useState<string>('');
    const [tokens, setTokens] = useState<Token[]>([]);
    const [balances, setBalances] = useState<Record<string, ethers.BigNumber>>({});
    const [allowances, setAllowances] = useState<Record<string, ethers.BigNumber>>({});
    const [route, setRoute] = useState<Route | null>(null);
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const isChainValid = useMemo(() => !!chainId && chainId in Chain, [chainId]);

    const nativeToken = useMemo(
        () => {
            const nativeCurrency = chains.find(
                chain => chain.chainId === chainId,
            )?.currency;
            if (!nativeCurrency) return null;
            return new Token(
                chainId!,
                ethers.constants.AddressZero,
                18,
                nativeCurrency,
                `Native ${nativeCurrency}`
            );
        },
        [chainId]
    );

    const routerAddress = useMemo(
        () => chainId ? chainInfo[chainId]?.routerAddress : undefined,
        [chainId]
    );

    const isAllFilled = useMemo(() =>
        !!fromTokenAddress && !!toTokenAddress && Number(fromTokenAmount) > 0 && Number(toTokenAmount) > 0,
        [fromTokenAddress, toTokenAddress, fromTokenAmount, toTokenAmount]
    );

    const isApprovalNeeded = useMemo(
        () => !!fromTokenAddress && Number(fromTokenAmount) > 0 && !!allowances[fromTokenAddress]?.lt(
            ethers.utils.parseUnits(
                fromTokenAmount,
                tokens.find(({ address }) => address === fromTokenAddress)?.decimals ?? 18,
            )
        ),
        [fromTokenAddress, fromTokenAmount, allowances, tokens]
    );

    const tokenIn = useMemo(() => fromTokenAddress ? tokens.find((token) =>
        token.address === fromTokenAddress,
    ) : undefined, [fromTokenAddress, tokens]);

    const tokenOut = useMemo(() => toTokenAddress? tokens.find((token) =>
        token.address === toTokenAddress,
    ) : undefined, [toTokenAddress, tokens]);

    const fetchAllTokensInfo = useCallback(() => {
        if (!isChainValid || !userAddress || !walletProvider || !routerAddress) return;

        setIsLoadingTokens(true);
        getAllTokens(chainId!) // load tokens
            .then((tokens) => {
                setTokens([nativeToken!, ...tokens]);

                // get balances and allowances of tokens via multicall
                const provider = new ethers.providers.Web3Provider(walletProvider, chainId);

                const multicall3Instance = new ethers.Contract(
                    multicall3Address,
                    Multicall3ABI,
                    provider,
                );

                const balanceCallData = erc20Interface.encodeFunctionData('balanceOf', [userAddress]);
                const allowanceCallData = erc20Interface.encodeFunctionData('allowance', [userAddress, routerAddress]);
                const ethBalanceCallData = multicall3Instance.interface.encodeFunctionData('getEthBalance', [userAddress]);

                const calls = tokens.flatMap(({ address: target }) => [
                    {
                        target,
                        callData: balanceCallData,
                        allowFailure: true,
                    },
                    {
                        target,
                        callData: allowanceCallData,
                        allowFailure: true,
                    }
                ]);
                calls.push(
                    {
                        target: multicall3Address,
                        callData: ethBalanceCallData,
                        allowFailure: true,
                    }
                );

                return multicall3Instance.callStatic.aggregate3(calls)
                    .then((data) => data.map(([success, balance]: [boolean, any]) => success ?
                        ethers.BigNumber.from(balance) :
                        ethers.constants.Zero
                    )).then((result: ethers.BigNumber[]) => {
                        const tokensData = tokens.map(({ address }, index) => ({
                            address,
                            balance: result[index * 2],
                            allowance: result[index * 2 + 1],
                        }));
                        const ethBalance = result[result.length - 1];

                        const balances = {
                            ...Object.fromEntries(tokensData.map(data => [data.address, data.balance])),
                            [ethers.constants.AddressZero]: ethBalance,
                        };
                        const allowances = {
                            ...Object.fromEntries(tokensData.map(data => [data.address, data.allowance])),
                            [ethers.constants.AddressZero]: ethers.constants.MaxUint256, // native token is "always allowed"
                        };
                        setBalances(balances);
                        setAllowances(allowances);
                    });
            }, e => console.error(e))
            .finally(() => {
                setFromTokenAddress(undefined);
                setToTokenAddress(undefined);
                setFromTokenAmount('');
                setToTokenAmount('');
                setRoute(null);
                setIsLoadingTokens(false);
            });
    }, [chainId, isChainValid, nativeToken, walletProvider, userAddress, routerAddress]);

    useEffect(() => {
        if (!isChainValid || !userAddress || !walletProvider || !routerAddress) return;

        fetchAllTokensInfo();
    }, [fetchAllTokensInfo, isChainValid, walletProvider, userAddress, routerAddress]);

    useEffect(() => {
        if (!fromTokenAddress) return;
        setToTokenAddress(toTokenAddress => toTokenAddress === fromTokenAddress ?
            undefined :
            toTokenAddress
        );
    }, [fromTokenAddress]);
    useEffect(() => {
        if (!toTokenAddress) return;
        setFromTokenAddress(fromTokenAddress => fromTokenAddress === toTokenAddress ?
            undefined :
            fromTokenAddress
        );
    }, [toTokenAddress]);

    const fetchRoute = useDebouncedCallback((
        tokenIn: Token,
        tokenOut: Token,
        amountFormatted: string,
        chainId: Chain,
        isExactInput: boolean,
    ) => {
        if (!amountFormatted) return;

        const decimals = isExactInput ? tokenIn.decimals : tokenOut.decimals;
        const amount = ethers.utils.parseUnits(amountFormatted, decimals);

        if (amount.isZero()) {
            if (isExactInput) {
                setToTokenAmount('0');
            } else {
                setFromTokenAmount('0');
            }
            return;
        }

        const router = new Router({ isExactInput });
        setIsLoadingRoute(true);
        try {
            router.getRoute(tokenIn, tokenOut, amount, chainId)
                .then((route) => {
                    setRoute(route);
                    console.log(route);
                    if (isExactInput) {
                        setToTokenAmount(route.tokenOut.balance);
                    } else {
                        setFromTokenAmount(route.tokenIn.balance);
                    }
                }, (e: any) => {
                    console.error(e);
                    setRoute(null);
                })
                .finally(() => setIsLoadingRoute(false));
        } catch (e) {
            console.error(e);
            setIsLoadingRoute(false);
        }
    }, 1000);

    useEffect(() => {
        if (!isExactInput || !tokenIn || !tokenOut || isLoadingTokens) return;
        fetchRoute(tokenIn, tokenOut, fromTokenAmount, chainId as Chain, true);
    }, [isLoadingTokens, chainId, tokenIn, fromTokenAmount, tokenOut, isExactInput, fetchRoute]);

    useEffect(() => {
        if (isExactInput || !tokenIn || !tokenOut || isLoadingTokens) return;
        fetchRoute(tokenIn, tokenOut, toTokenAmount, chainId as Chain, false);
    }, [isLoadingTokens, chainId, tokenIn, toTokenAmount, tokenOut, isExactInput, fetchRoute]);

    const approve = useCallback(() => {
        if (!routerAddress || !fromTokenAddress || !walletProvider) return;
        setIsApproving(true);

        const ethersProvider = new ethers.providers.Web3Provider(walletProvider, chainId);
        const signer = ethersProvider.getSigner();

        const erc20Instance = new ethers.Contract(
            fromTokenAddress,
            ERC20ABI,
            signer
        );
        erc20Instance.approve(routerAddress, ethers.constants.MaxUint256) // approve token usage
            .then((tx: TransactionResponse) => tx.wait().then(() =>
                erc20Instance.allowance(userAddress, routerAddress) // check new allowance
                    .then((allowance: ethers.BigNumber) => setAllowances(old => ({
                        ...old,
                        [fromTokenAddress]: allowance,
                    })))
            ))
            .catch((e: any) => console.error(e))
            .finally(() => setIsApproving(false));
    }, [walletProvider, chainId, userAddress, routerAddress, fromTokenAddress]);

    const swap = useCallback(() => {
        if (!route || !walletProvider) return;
        setIsSwapping(true);

        const ethersProvider = new ethers.providers.Web3Provider(walletProvider, chainId);
        const signer = ethersProvider.getSigner();

        const router = new Router();

        router.generateMulticallData(route, signer)
            .then(data => router.executeMulticall(
                chainId as Chain,
                data,
                signer,
                route.tokenIn.isNative ? route.tokenIn.balanceBN : undefined
            ).then((tx) => tx.wait().then(() => {
                fetchAllTokensInfo(); // simple example: just refetch everything
                alert('Swapped successfully!');
            })))
            .catch(e => console.error(e))
            .finally(() => setIsSwapping(false));
    }, [route, walletProvider, chainId, fetchAllTokensInfo]);

    return (
        <div className="flex flex-1 self-stretch items-center justify-center">
            <div className="flex flex-col gap-4 rounded-main px-11 py-8 w-[384px] bg-card-background border border-card-border">
                <h1 className="text-center">Swap tokens</h1>
                <Select
                    label="From token"
                    selectedKeys={fromTokenAddress ? [fromTokenAddress] : []}
                    isLoading={isLoadingTokens}
                    disabled={isLoadingRoute}
                    onSelectionChange={(e) => setFromTokenAddress(e === 'all' ? undefined : e.values().next().value)}
                >
                    {tokens.map((token) => <SelectItem key={token.address} textValue={token.symbol}>
                        <div className="flex flex-row">
                            <div className="flex flex-col flex-1 min-w-0">
                                <div>{token.symbol}</div>
                                <div className="text-text-secondary overflow-hidden overflow-ellipsis">{token.name}</div>
                            </div>
                            <div className="flex flex-col shrink-0 min-w-0 text-text-secondary">
                                <div>Balance:</div>
                                <div className="overflow-hidden overflow-ellipsis">{
                                    Number(ethers.utils.formatUnits(balances[token.address] ?? '0', token.decimals ?? 18)).toFixed(3)
                                }</div>
                            </div>
                        </div>
                    </SelectItem>)}
                </Select>
                <Input
                    label="From token amount"
                    type="number"
                    step="0.001"
                    min="0"
                    value={fromTokenAmount}
                    disabled={!isExactInput && isLoadingRoute}
                    onValueChange={value => {
                        setFromTokenAmount(value.replaceAll(/[^0-9.,]/g, ''));
                        setToTokenAmount('');
                        setIsExactInput(true);
                    }}
                />
                <Select
                    label="To token"
                    selectedKeys={toTokenAddress ? [toTokenAddress] : []}
                    isLoading={isLoadingTokens}
                    disabled={isLoadingRoute}
                    onSelectionChange={(e) => setToTokenAddress(e === 'all' ? undefined : e.values().next().value)}
                >
                    {tokens.map((token) => <SelectItem key={token.address} textValue={token.symbol}>
                        <div className="flex flex-row">
                            <div className="flex flex-col flex-1 min-w-0">
                                <div>{token.symbol}</div>
                                <div className="text-text-secondary overflow-hidden overflow-ellipsis">{token.name}</div>
                            </div>
                            <div className="flex flex-col shrink-0 min-w-0 text-text-secondary">
                                <div>Balance:</div>
                                <div className="overflow-hidden overflow-ellipsis">{
                                    Number(ethers.utils.formatUnits(balances[token.address] ?? '0', token.decimals ?? 18)).toFixed(3)
                                }</div>
                            </div>
                        </div>
                    </SelectItem>)}
                </Select>
                <Input
                    label="To token amount"
                    type="number"
                    step="0.001"
                    min="0"
                    value={toTokenAmount}
                    disabled={isExactInput && isLoadingRoute}
                    onValueChange={value => {
                        setToTokenAmount(value.replaceAll(/[^0-9.,]/g, ''));
                        setFromTokenAmount('');
                        setIsExactInput(false);
                    }}
                />
                <Button
                    className="bg-accent"
                    fullWidth
                    isDisabled={!isClient || !isChainValid || !isAllFilled || isLoadingTokens || isLoadingRoute || !route?.steps?.length || isSwapping || isApproving}
                    onClick={isApprovalNeeded ? approve : swap}
                >
                    {
                        isLoadingTokens ?
                            'Loading tokens list...' :
                            isLoadingRoute ?
                                'Loading route...' :
                                isApproving ?
                                    'Approving token usage...' :
                                    isSwapping ?
                                        'Swapping tokens...' :
                                        !route?.steps?.length ?
                                            'No routes found' :
                                            isApprovalNeeded ?
                                                'Approve token usage' :
                                                `Swap (exact ${isExactInput ? 'input' : 'output'})`
                    }
                </Button>
            </div>
        </div>
    );
}
