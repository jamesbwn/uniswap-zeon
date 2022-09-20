import { MaxUint256 } from '@ethersproject/constants'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import { sendAnalyticsEvent } from 'components/AmplitudeAnalytics'
import { EventName } from 'components/AmplitudeAnalytics/constants'
import { USDT_ADDRESS, USDT_ADDRESS_V1, ZEON_ADDRESS, ZEON_SALE_ADDRESS, ZEON_SALE_ADDRESS_V1 } from 'constants/addresses'
import { BigNumber } from '@ethersproject/bignumber'
import { useSingleCallResult } from 'lib/hooks/multicall'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useTokenContract, useUsdtContract, useZeonContract, useZeonSaleContract } from './useContract'
import { calculateGasMargin } from 'utils/calculateGasMargin'
import { USDT, ZEON_MAINNET } from 'constants/tokens'
import useRefresh from './useRefresh'

// returns undefined if input token is undefined, or fails to get token contract,
// or contract total supply cannot be fetched
export function useTotalSupply(token?: Currency): CurrencyAmount<Token> | undefined {
  const contract = useTokenContract(token?.isToken ? token.address : undefined, false)

  const totalSupplyStr: string | undefined = useSingleCallResult(contract, 'totalSupply')?.result?.[0]?.toString()

  return useMemo(
    () => (token?.isToken && totalSupplyStr ? CurrencyAmount.fromRawAmount(token, totalSupplyStr) : undefined),
    [token, totalSupplyStr]
  )
}

export function useSaleActive() {
  const [active, setActive] = useState(false);
  const zeonSaleContract = useZeonSaleContract();
  useEffect(() => {
    async function fetchSale() {
      const data = await zeonSaleContract?.isSaleActive();
      setActive(data)
    }
    fetchSale()
  }, [zeonSaleContract])

  return active
}

export function useZeonRate() {
  const [rate, setRate] = useState(BigNumber.from(1));
  const zeonSaleContract = useZeonSaleContract();
  useEffect(() => {
    async function fetchSale() {
      const data = await zeonSaleContract?.zeonPerUSDT();
      setRate(data)
    }
    fetchSale()
  }, [zeonSaleContract])

  return rate
}

export function useZeonRemain() {
  const [remain, setRemain] = useState(BigNumber.from(0))
  const zeonAddress = ZEON_MAINNET.address
  const zeonSaleAddress = ZEON_SALE_ADDRESS_V1
  const zeonContract = useTokenContract(zeonAddress, true);
  useEffect(() => {
    async function fetchData() {
      const data = await zeonContract?.balanceOf(zeonSaleAddress)
      if(data) {
        setRemain(data)
      }
    }
    fetchData()
  }, [zeonSaleAddress, zeonContract])

  return remain
}

export function useUSDTAllowance() {
  const [allow, setAllow] = useState(BigNumber.from(0))
  const { account} = useWeb3React()
  const zeonSaleAddress = ZEON_SALE_ADDRESS_V1
  const usdtContract = useUsdtContract()
  const {fastRefresh}= useRefresh()
  useEffect(() => {
    async function fetchData() {
      if(usdtContract && account) {
        const data = await usdtContract.allowance(account, zeonSaleAddress)
        setAllow(data)
      }
    }
    fetchData()
    console.log('debug fast ref st2', fastRefresh)

  }, [usdtContract, zeonSaleAddress, account, fastRefresh])

  return allow
}

export function useMintCallback(
  _mintAmount?: string
): [() => Promise<void>] {
  const zeonSaleContract = useZeonSaleContract()
  const { chainId } = useWeb3React()
  const setMint = useCallback(async (): Promise<void> => {

    if (!zeonSaleContract) {
      console.error('zeonSaleContract is null')
      return
    }
    
    if (!_mintAmount) {
      console.error('no mintAmount', _mintAmount)
      return
    }
    
    const estimatedGas = await zeonSaleContract.estimateGas.buy(_mintAmount).catch(() => {
      // general fallback for tokens who restrict approval amounts
      return zeonSaleContract.estimateGas.buy(_mintAmount)
    })

    return zeonSaleContract
      .buy(_mintAmount,  {
        gasLimit: calculateGasMargin(estimatedGas),
      })
      .then(() => {
        const eventProperties = {
          chain_id: chainId,
          token_address: zeonSaleContract?.address,
        }
        sendAnalyticsEvent(EventName.ZEON_SWAP_TXN_SUBMITTED, eventProperties)
        return {
          tokenAddress: zeonSaleContract?.address,
        }
      })
      .catch((error: Error) => {
        console.debug('ZEON BUY::', error)
        throw error
      })
  }, [zeonSaleContract, _mintAmount])

  return [setMint]
}

export function useUSDTApproveCallback(
): [() => Promise<void>] {
  const usdtContract = useUsdtContract()
  const setApprove = useCallback(async () => {

    if (!usdtContract) {
      console.error('usdtContract is null')
      return
    }

    const estimatedGas = await usdtContract.estimateGas.approve(ZEON_SALE_ADDRESS_V1, MaxUint256).catch(() => {
      // general fallback for tokens who restrict approval amounts
      return usdtContract.estimateGas.approve(ZEON_SALE_ADDRESS_V1, MaxUint256)
    })

    return usdtContract
    .approve(ZEON_SALE_ADDRESS_V1, MaxUint256, {
        gasLimit: calculateGasMargin(estimatedGas),
      })
    .catch((error: Error) => {
      console.debug('USDT Approve::', error)
      throw error
    })
  }, [usdtContract])

  return [setApprove]
}
