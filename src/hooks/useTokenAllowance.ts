import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import { useSingleCallResult } from 'lib/hooks/multicall'
import { useMemo } from 'react'

import { useTokenContract } from './useContract'

export function useTokenAllowance(token?: Token, owner?: string, spender?: string): CurrencyAmount<Token> | undefined {
  const contract = useTokenContract(token?.address, false)

  const inputs = useMemo(() => [owner, spender], [owner, spender])
  const allowance = useSingleCallResult(contract, 'allowance', inputs).result

  return useMemo(
    () => (token && allowance ? CurrencyAmount.fromRawAmount(token, allowance.toString()) : undefined),
    [token, allowance]
  )
}

export function useTokenAllowanceCustom(token?: Token, owner?: string, spender?: string): string | undefined {
  const contract = useTokenContract(token?.address, false)

  const inputs = useMemo(() => [owner, spender], [owner, spender])
  const allowance = useSingleCallResult(contract, 'allowance', inputs).result

  return useMemo(
    () => (token && allowance ? allowance.toString() : undefined),
    [token, allowance]
  )
}

// export function useUSDTAllowance() {
//   const [allow, setAllow] = useState(BigNumber.from(0))
//   const { chainId, account} = useWeb3React()
//   const usdtAddress = chainId ? USDT_ADDRESS[chainId] : undefined
//   const zeonSaleAddress = chainId ? ZEON_SALE_ADDRESS[chainId] : undefined
//   const usdtContract = useTokenContract(usdtAddress, true);
//   useEffect(() => {
//     async function fetchData() {
//       if(usdtContract && account && zeonSaleAddress) {
//         const data = await usdtContract.allowance(account, zeonSaleAddress)
//         setAllow(data)
//       }
//     }
//     fetchData()
//   }, [usdtContract, zeonSaleAddress, account])

//   return allow
// }