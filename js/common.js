let cfans = ""

const validateSubscription = async () => {
  try {
    cfans = await exdc.getCryptoFansAddress()
    const info = await exdc.getServicePaymentInfo(cfans)
    console.info('info', info)
    // console.info('subscription', subscription)
    const isServiceValid = await exdc.checkServiceValid(cfans)
    console.info('isvalid', isServiceValid)
    const payModal = document.getElementById("pay-modal")
    if(isServiceValid === true && payModal) {
      payModal.className = "hidden";
      // Load existing configuration when the page loads
      if(cb) cb()
      // loadExistingConfig();
    }
  } catch(err) {
    console.error('err', err)
  }
}

const uploadFile = async (e) => {
  // console.info('file', e.value, e.files[0])
  const file = e.files[0]
  const {signer} = (await exdc.getProvider())
  console.info('signer', signer)
  const payload = JSON.stringify({size:file.size, name:file.name})
  const userContractAddress = await exdc.currentShopContract(cfans, exdc.getProvider().address)
  const signature = await signer.signMessage(payload)
  console.info("signature", signature)
  const recovered = ethers.verifyMessage(payload, signature);
  console.info("recovered", recovered)
  const data = new FormData()
  data.append('file', file)
  data.append('payload', payload)
  data.append('signature', signature)
  data.append('userContractAddress', userContractAddress)
  try {

    const req = await fetch(`https://cryptofans.io/api/file/upload`, {
      method: 'POST',
      body: data
    })
    const res = await req.json()
  
    console.info('file upload json', res)
  
  } catch(err) {

  }  
  const url = `https://cdn.cryptofans.io/${userContractAddress}/${file.name}`
  console.info(url)
  document.getElementById("profile-avatar").src = url
  return res
}

const getContractData = async () => {
  const cadress = await exdc.currentShopContract(cfans, exdc.getProvider().address)
  const service = await exdc.connectToExchangeService(cadress)
  const contract = await service.userData()
  const abiCoder = new ethers.AbiCoder()
  const body = abiCoder.decode(["string"], contract)
  const info = JSON.parse(body)
  return info
}

const writeContractData = async (data) => {
  console.info('write contract data', data)
  const cadress = await exdc.currentShopContract(cfans, exdc.getProvider().address)
  const service = await exdc.connectToExchangeService(cadress)
  const abiCoder = new ethers.AbiCoder()
  const json = JSON.stringify(data)
  
  const body = abiCoder.encode(["string"], [json])
  await (await service.changeUserData(body)).wait(1)
}