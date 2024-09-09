const buyButton = document.getElementById("buyButton")
const payModal = document.getElementById("pay-modal")

const buyServiceAction = async () => {
  const smart = await exdc.buyServiceSmart(cfans)
  isServiceValid = await exdc.checkServiceValid(cfans)
  if(isServiceValid === true) {
    payModal.className = "hidden";
    // Load existing configuration when the page loads
    loadExistingConfig();
  } else {
    hidePreloader()
  }
}

buyButton.addEventListener("click", async ()=>buyServiceAction())



// Subscription tier management
let tiers = [];
let selectedTierId = null;

function addTier(name = '', price = '', duration = '', benefits = '') {
  const tierId = `tier-${tiers.length}`;
  const newTier = { id: tierId, name, price, duration, benefits };
  tiers.push(newTier);
  renderTiersList();
  renderTierDetails(tierId);
}

function updateTier(tierId, name, price, duration, benefits) {
  const index = tiers.findIndex(tier => tier.id === tierId);
  if (index !== -1) {
    tiers[index] = { ...tiers[index], name, price, duration, benefits };
    renderTiersList();
    renderTierDetails(tierId);
  }
}

function removeTier(tierId) {
  tiers = tiers.filter(tier => tier.id !== tierId);
  renderTiersList();
  if (selectedTierId === tierId) {
    selectedTierId = null;
    renderTierDetails(null);
  }
}

function renderTiersList() {
  const container = document.getElementById('tiers-list-container');
  
  container.innerHTML = tiers.map(tier => `
    <div class="tier-item ${(tier.id || 'tier-0') === selectedTierId ? 'active' : ''}" onclick="selectTier('${tier.id || 'tier-0'}')">
      ${tier.name}
    </div>
  `).join('');
}

function renderTierDetails(tierId = 'tier-0') {
  const container = document.getElementById('tier-details-container');
  if (!tierId) {
    container.innerHTML = '<p>Select a tier to view details</p>';
    return;
  }

  const tier = tiers.find(t => (t.id || 'tier-0') === tierId);
  if (!tier) return;
  

  container.innerHTML = `
    <div class="form-group">
      <label for="${tierId}-name">Tier Name</label>
      <input type="text" id="${tierId}-name" value="${tier.name}" onchange="updateTierField('${tierId}', 'name', this.value)">
    </div>
    <div class="form-group">
      <label for="${tierId}-price">Price</label>
      <input type="number" id="${tierId}-price" value="${tier.price}" onchange="updateTierField('${tierId}', 'price', this.value)">
    </div>
    <div class="form-group">
      <label for="${tierId}-duration">Duration (days)</label>
      <input type="number" id="${tierId}-duration" value="${tier.duration}" onchange="updateTierField('${tierId}', 'duration', this.value)">
    </div>
    <div class="form-group">
      <label for="${tierId}-benefits">Benefits</label>
      <textarea id="${tierId}-benefits" rows="3" onchange="updateTierField('${tierId}', 'benefits', this.value)">${tier.benefits}</textarea>
    </div>
    <div class="form-group">
      <label for="${tierId}-currency">Currency</label>
      <select id="${tierId}-currency" name="${tierId}-currency" required onchange="updateTierField('${tierId}', 'currency', this.value)">
        <option value="EXDC">EXDC</option>
      </select>
    </div>
    <button type="button" class="btn btn-secondary" onclick="removeTier('${tierId}')">Remove Tier</button>
  `;
}

function selectTier(tierId) {
  selectedTierId = tierId;
  renderTiersList();
  renderTierDetails(tierId);
}

function updateTierField(tierId, field, value) {
  const tier = tiers.find(t => t.id === tierId);
  if (tier) {
    tier[field] = value;
    renderTiersList();
  }
}

const getShopService = async () =>{
  const market = await exdc.connectToExchangeService(cfans)
  const subContract = await market.userContracts(exdc.getProvider().address);
  return {market, subContract}
}


const createSmartService = async (config) => {
  const excd = await exdc.connectToExchangeToken();
  const {subContract} = await getShopService()
  try {
    const existing = await getMyShop(subContract)
    console.info('existing', existing)
    if(existing) {
      const service = await exdc.connectToExchangeService(existing);
      return {contract:service, contractAddress:existing};
    }
  } catch(err) {
    console.error(err)
  }
  const sig = exdc.getProvider().address
  const createContract = async () => {
    console.info(config, sig, subContract)
    const contractTx = await (
      (await excd.createServiceUserContract(
        config.subsPrice,
        config.coin,
        1,
        sig,
        config.operator,
        config.ratings,
        true,
        config.subsInterval,
        config.category,
        subContract,
      ))
    ).wait(1);
    const contractAddress = await getMyShop(subContract)
    const service = await exdc.connectToExchangeService(contractAddress);
    return {contract:service, contractAddress};
  };
  const service = await createContract();
  return service;
};

document.getElementById('add-tier-btn').addEventListener('click', () => addTier('New Tier', '0', '30', ''));

// Form submission
document.getElementById('shop-config-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Get form data
  const shopName = document.getElementById('shop-name').value;
  const shopDescription = document.getElementById('shop-description').value;
  const commissionRate = document.getElementById('commission-rate').value;
  const avatarUrl  = document.getElementById("profile-avatar").src
  const formData = new FormData(e.target);
  if(!isServiceValid) {
    payModal.className = "overlay"
    return;
  }
  const contentData = Object.fromEntries(formData.entries());
  console.info("contentData",contentData)
  // Prepare shop configuration object
  const shopConfig = {
    name: shopName,
    description: shopDescription,
    commissionRate,
    avatarUrl,
    subscriptionTiers: tiers
  };
  console.info('shopConfig', shopConfig)
  const cadress = await exdc.currentShopContract(cfans, exdc.getProvider().address)
  const service = await exdc.connectToExchangeService(cadress)
  const abiCoder = new ethers.AbiCoder()
  let oldData = {}
  try {
    oldData = await getContractData()
  } catch(err) {
    console.error(err)
  }
  if(!oldData || oldData.services?.length === 0) {
    await createSmartService({
      coin:exdc.exchangeTokenAddress('137'), 
      operator:"0x33314eBC03697c1C753E86D85B0dF57FC9891a05",
      ratings:10, 
      subsPrice:10,
      subsInterval:2419200,
      category:"cryptofans"
    })
  }
  const json = JSON.stringify({...shopConfig, posts:oldData?.posts || []})
  
  const body = abiCoder.encode(["string"], [json])

  await (await service.changeUserData(body)).wait(1)
  
  alert('Shop configuration saved successfully!');
});

// Cancel button
document.getElementById('cancel-btn').addEventListener('click', () => {
  if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
    window.location.href = '/profile';
  }
});

const mockConfig = {
  name: "",
  description: "",
  subscriptionTiers: [
    {
      name: "Basic", 
      price: 5, 
      duration: 28, 
      benefits: "Access to basic content and updates",
      currency: "EXDC"
    }
  ]
};
// Load existing shop configuration
const enableMock = () => {

  // Populate form fields
  document.getElementById('shop-name').value = mockConfig.name;
  document.getElementById('shop-description').value = mockConfig.description;
  // document.getElementById('default-currency').value = mockConfig.defaultCurrency;

  // Add subscription tiers
  mockConfig.subscriptionTiers.forEach(tier => {
    addTier(tier.name, tier.price, tier.duration, tier.benefits);
  });

  // Select the first tier by default
  if (tiers.length > 0) {
    selectTier(tiers[0].id);
  }
}
async function loadExistingConfig() {
  // This function would typically fetch the shop configuration from your backend or smart contract
  // For this example, we'll use mock data
  try {
    const cadress = await exdc.currentShopContract(cfans, exdc.getProvider().address)
    const service = await exdc.connectToExchangeService(cadress)
    const contract = await service.userData()
    const original = await service.originalContract()
    console.info('original', original)
    console.info('contract info', contract, cadress)
    if(contract && contract !== "0x") {
      const abiCoder = new ethers.AbiCoder()
      const body = abiCoder.decode(["string"], contract)
      const info = JSON.parse(body)
      document.getElementById('shop-name').value = info?.name || "";
      document.getElementById('shop-description').value = info?.description || "";
      // document.getElementById('default-currency').value = info?.defaultCurrency || "USDC";
      const avatar = document.getElementById("profile-avatar")
      if(info.avatarUrl) {
          avatar.src = ((url)=>url)(info.avatarUrl);
      }
      // Add subscription tiers
      (info?.subscriptionTiers?.length ? info : mockConfig).subscriptionTiers.forEach(tier => {
        addTier(tier.name, tier.price, tier.duration, tier.benefits);
      });
      tiers = (info?.subscriptionTiers?.length ? info : mockConfig).subscriptionTiers
      
      hidePreloader()
      return;
    }
  } catch(err) {
    console.info('error on loading config', err)
  }
  hidePreloader()
  enableMock()
}


const EXDCscript = document.querySelector('#exdc');
EXDCscript.addEventListener('load', function() {
  window.exdc = new EXDC_SDK()
  exdc.checkMetaMask()
  .then(()=>validateSubscription())
  .then(()=>loadExistingConfig())
})