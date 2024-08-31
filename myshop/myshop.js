const buyButton = document.getElementById("buyButton")
buyButton.addEventListener("click", async ()=>{
  const smart = await exdc.buyServiceSmart(cfans)
  const isServiceValid = await exdc.checkServiceValid(cfans)
  if(isServiceValid === true) {
    document.getElementById("pay-modal").className = "hidden";
    // Load existing configuration when the page loads
    loadExistingConfig();
  }
})



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
    <div class="tier-item ${tier.id === selectedTierId ? 'active' : ''}" onclick="selectTier('${tier.id}')">
      ${tier.name}
    </div>
  `).join('');
}

function renderTierDetails(tierId) {
  const container = document.getElementById('tier-details-container');
  if (!tierId) {
    container.innerHTML = '<p>Select a tier to view details</p>';
    return;
  }

  const tier = tiers.find(t => t.id === tierId);
  if (!tier) return;

  container.innerHTML = `
    <div class="form-group">
      <label for="${tier.id}-name">Tier Name</label>
      <input type="text" id="${tier.id}-name" value="${tier.name}" onchange="updateTierField('${tier.id}', 'name', this.value)">
    </div>
    <div class="form-group">
      <label for="${tier.id}-price">Price</label>
      <input type="number" id="${tier.id}-price" value="${tier.price}" onchange="updateTierField('${tier.id}', 'price', this.value)">
    </div>
    <div class="form-group">
      <label for="${tier.id}-duration">Duration (days)</label>
      <input type="number" id="${tier.id}-duration" value="${tier.duration}" onchange="updateTierField('${tier.id}', 'duration', this.value)">
    </div>
    <div class="form-group">
      <label for="${tier.id}-benefits">Benefits</label>
      <textarea id="${tier.id}-benefits" rows="3" onchange="updateTierField('${tier.id}', 'benefits', this.value)">${tier.benefits}</textarea>
    </div>
    <button type="button" class="btn btn-secondary hidden" onclick="removeTier('${tier.id}')">Remove Tier</button>
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

document.getElementById('add-tier-btn').addEventListener('click', () => addTier('New Tier', '0', '30', ''));

// Form submission
document.getElementById('shop-config-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Get form data
  const shopName = document.getElementById('shop-name').value;
  const shopDescription = document.getElementById('shop-description').value;
  const defaultCurrency = document.getElementById('default-currency').value;
  const commissionRate = document.getElementById('commission-rate').value;
  const avatarUrl  =document.getElementById("profile-avatar").src
  console.info("avatarUrl",avatarUrl)
  // Prepare shop configuration object
  const shopConfig = {
    name: shopName,
    description: shopDescription,
    defaultCurrency,
    commissionRate,
    avatarUrl,
    subscriptionTiers: tiers
  };

  // Here you would typically send this data to your backend or smart contract
  console.log('Shop configuration to be saved:', shopConfig);
  const cadress = await exdc.currentShopContract(cfans, exdc.getProvider().address)
  const service = await exdc.connectToExchangeService(cadress)
  const abiCoder = new ethers.AbiCoder()
  const oldData = await getContractData()
  const json = JSON.stringify({...shopConfig, posts:oldData.posts})
  
  const body = abiCoder.encode(["string"], [json])
  await (await service.changeUserData(body)).wait(1)
  // Simulating a successful save
  alert('Shop configuration saved successfully!');
  
  // Optionally, redirect to the shop page or refresh the current page
  // window.location.href = '/shop';
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
  defaultCurrency: "USDC",
  subscriptionTiers: [
    {name: "Paid", price: 10, duration: 28, benefits: "Access to basic content"}
  ]
};
// Load existing shop configuration
const enableMock = () => {

  // Populate form fields
  document.getElementById('shop-name').value = mockConfig.name;
  document.getElementById('shop-description').value = mockConfig.description;
  document.getElementById('default-currency').value = mockConfig.defaultCurrency;

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
      document.getElementById('default-currency').value = info?.defaultCurrency || "USDC";
      const avatar = document.getElementById("profile-avatar")
      if(info.avatarUrl) {
          avatar.src = ((url)=>url)(info.avatarUrl);
      }
      // Add subscription tiers
      (info?.subscriptionTiers?.length ? info : mockConfig).subscriptionTiers.forEach(tier => {
        addTier(tier.name, tier.price, tier.duration, tier.benefits);
      });
      tiers = (info?.subscriptionTiers?.length ? info : mockConfig).subscriptionTiers
      return;
    }
  } catch(err) {
    console.info('error on loading config', err)
  }
  enableMock()
}


const EXDCscript = document.querySelector('#exdc');
EXDCscript.addEventListener('load', function() {
  window.exdc = new EXDC_SDK()
  exdc.checkMetaMask()
  .then(()=>validateSubscription())
  .then(()=>loadExistingConfig())
})