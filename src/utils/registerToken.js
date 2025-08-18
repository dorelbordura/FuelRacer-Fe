import {hasEnoughFuelTokens} from './checkFuelTokenBalance';
import config from '../config.json';

const {BACKEND_URL} = config;

export default async function registerToken(provider, signer, address) {
  const access = await hasEnoughFuelTokens(provider, address)

  const nonceRes = await fetch(`${BACKEND_URL}/auth/nonce?address=${address}`)
  const { nonce } = await nonceRes.json()
  const signature = await signer.signMessage(`FuelRacer login ${nonce}`)

  const verifyRes = await fetch(`${BACKEND_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature })
  })
  const { token } = await verifyRes.json()

  localStorage.setItem('fr_jwt', token)
  return { address, access }
}
