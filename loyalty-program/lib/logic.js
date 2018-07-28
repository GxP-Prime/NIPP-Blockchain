/**
 * An Award is rewarded
 * @param {org.acme.loyalty.reward.Rewarding} rewarding - the Rewarding transaction
 * @transaction
 */

function giveReward(rewarding) {
  var reward = rewarding.reward
  var valueAwarded = reward.originalValue
  
  reward.issuer.accountBalance = reward.issuer.accountBalance - valueAwarded
  reward.receiver.accountBalance = reward.receiver.accountBalance + valueAwarded
  
  return getParticipantRegistry('org.acme.loyalty.reward.Receiver')
        .then(function (receiverRegistry) {
            // update the receiver's balance
            return receiverRegistry.update(reward.receiver);
        })
        .then(function () {
            return getParticipantRegistry('org.acme.loyalty.reward.Company');
        })
        .then(function (issuerRegistry) {
            // update the issuer's balance
            return issuerRegistry.update(reward.issuer);
        });
}


/**
 * An Award is redeemed
 * @param {org.acme.loyalty.reward.Redemption} redemption - the Redemption transaction
 * @transaction
 */

function redeemReward(redemption) {
  var redeem = redemption.redeem
  
  var value = redeem.value
  
  var contract = redeem.contract
  var limit = contract.limit
  var contractReceiverID = contract.requestor.email
  var contractReedemerID = contract.redeemer.email
  var i
  var receiverID = redeem.requestor.email
  var redeemerID = redeem.redeemer.email
  var rewardsUsed = redeem.reward
  
  if ( receiverID === contractReceiverID && redeemerID === contractReedemerID){
    if ( value <= limit  && value <= redeem.requestor.accountBalance){
      for (i=0; i<rewardsUsed.length; i++){
        rewardsUsed[i].reward.value = rewardsUsed[i].reward.value - rewardsUsed[i].value
      }
      
      
      redeem.requestor.accountBalance = redeem.requestor.accountBalance - value
      redeem.redeemer.accountBalance = redeem.redeemer.accountBalance + value
      
      return getParticipantRegistry('org.acme.loyalty.reward.Receiver')
        .then(function (receiverRegistry) {
            // update the requestor's balance
            return receiverRegistry.update(redeem.requestor);
        })
        .then(function () {
            return getParticipantRegistry('org.acme.loyalty.reward.Company');
        })
        .then(function (reedemerRegistry) {
            // update the reedemer's balance
            return reedemerRegistry.update(redeem.redeemer);
        })
      .then(function () {
            return getAssetRegistry('org.acme.loyalty.reward.Reward');
        })
        .then(function (rewardRegistry) {
            // update the rewards
        	var rewards = []
        	for (i=0;i<rewardsUsed.length;i++){
              rewards.push(rewardsUsed[i].reward)
            }
        	
            return rewardRegistry.updateAll(rewards);
        })
      .then(function () {
        	
            return getAssetRegistry('org.acme.loyalty.reward.Contract');
        })
        .then(function (contractRegistry) {
            // update the contract
            return contractRegistry.update(redeem.contract);
        });
      
    }
  }
}

/**
 * An Award is redeemed
 * @param {org.acme.loyalty.reward.Expiration} expiration - the Expiration transaction
 * @transaction
 */

function rewardExpired(expiration) {
  var reward = expiration.reward
  var currentValue = reward.value
  reward.receiver.accountBalance = reward.receiver.accountBalance - currentValue
  var nowDate = new Date()
  var expiry = reward.expiryDate
  
  console.log(nowDate)
  console.log(expiry)
  if (nowDate > expiry && reward.status == "Active"){
    reward.status = "Expired"
    return getAssetRegistry('org.acme.loyalty.reward.Reward')
        .then(function (rewardRegistry) {
            // update the reward
            return rewardRegistry.update(expiration.reward);
        })
    
    	.then(function () {
        	
            return getParticipantRegistry('org.acme.loyalty.reward.Receiver');
        })
        .then(function (receiverRegistry) {
            // update the contract
            return receiverRegistry.update(expiration.reward.receiver);
        });
  }
}


/**
 * Initialize some test assets and participants useful for running a demo.
 * @param {org.acme.loyalty.reward.SetupDemo} setupDemo - the SetupDemo transaction
 * @transaction
 */
async function setupDemo(setupDemo) {  // eslint-disable-line no-unused-vars

    const factory = getFactory();
    const NS = 'org.acme.loyalty.reward';

    // create the company
    const company = factory.newResource(NS, 'Company', 'digital@ge.com');
    const companyAddress = factory.newConcept(NS, 'Address');
    companyAddress.country = 'India';
    company.address = companyAddress;
  	company.name = 'GE Digital';
    company.accountBalance = 0;

    // create the Receiver
    const receiver = factory.newResource(NS, 'Receiver', 'abhinav.garg1@ge.com');
    const receiverAddress = factory.newConcept(NS, 'Address');
    receiverAddress.country = 'India';
  	receiver.name = 'Abhinav Garg';
  	receiver.gender = 'Male';
  	receiver.phone = '8283828487';
  	receiver.dob = new Date(1995,02,24,12,35,57,980);
    receiver.address = receiverAddress;
    receiver.accountBalance = 0;


    // create the contract
    const contract = factory.newResource(NS, 'Contract', 'Contract001');
    contract.requestor = factory.newRelationship(NS, 'Receiver', 'abhinav.garg1@ge.com');
    contract.redeemer = factory.newRelationship(NS, 'Company', 'digital@ge.com');
  	contract.limit = 100;
  
  	// create the reward
    const reward = factory.newResource(NS, 'Reward', 'Reward001');
  	reward.issuedOn = new Date(2018,04,04,12,40,56,430);
  	reward.expiryDate = new Date(2018,06,10,11,34,21,430);
  	reward.TC = 'Test Reward';
  	reward.msg = 'Test';
  	reward.value = 200;
  	reward.originalValue = 200;
  	reward.status = 'Active';
  	reward.receiver = factory.newRelationship(NS, 'Receiver', 'abhinav.garg1@ge.com');
	reward.issuer = factory.newRelationship(NS, 'Company', 'digital@ge.com');

    // create the redeem
    const redeem = factory.newResource(NS, 'Redeem', 'Redeem001');
    redeem.value = 50;
  	redeem.receivedOn = new Date(2018,04,11,07,49,53,941);
  	const rewardUsed = factory.newConcept(NS, 'RewardsUsed');
    rewardUsed.reward = factory.newRelationship(NS, 'Reward', 'Reward001');
  	rewardUsed.value = 50;
  	redeem.reward = [rewardUsed];
    redeem.contract = factory.newRelationship(NS, 'Contract', 'Contract001');
  	redeem.requestor = factory.newRelationship(NS, 'Receiver', 'abhinav.garg1@ge.com');
	redeem.redeemer = factory.newRelationship(NS, 'Company', 'digital@ge.com');
  
    // add the Company
    const companyRegistry = await getParticipantRegistry(NS + '.Company');
    await companyRegistry.addAll([company]);

    // add the receiver
    const receiverRegistry =  await getParticipantRegistry(NS + '.Receiver');
    await receiverRegistry.addAll([receiver]);

    // add the contracts
    const contractRegistry =  await getAssetRegistry(NS + '.Contract');
    await contractRegistry.addAll([contract]);

    // add the rewards
    const rewardRegistry =  await getAssetRegistry(NS + '.Reward');
    await rewardRegistry.addAll([reward]);
  
  	// add the redeems
    const redeemRegistry =  await getAssetRegistry(NS + '.Redeem');
    await redeemRegistry.addAll([redeem]);
}