 
 const {  BatchWriteCommand, } = require("@aws-sdk/lib-dynamodb");

 export const writeFromYGOPRO = async () => { 
  function splitIntoBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }
   const batchWrite = async (batches) => {
return batches.forEach( async (batch) =>{
    const params = {
        RequestItems: {
          YGOCardDatabase: batch,
        },
      };
      const command = new BatchWriteCommand(params);
    try{
      await setTimeout( () => docClient.send(command),3000)
    }
    catch(err){
      console.log(err)
    }    
    })
  }
const allYgoCards = await axios.get("https://db.ygoprodeck.com/api/v7/cardinfo.php")
const allCardsFormatted = allYgoCards.data.data.map(card => {
  if(!card.id) return 
    const formattedCard = {
      PutRequest:{
        Item:{
          name: card.name,
          id: card.id,
          type: card.type,
          card_id: card.id
        },
        ConditionExpression: "attribute_not_exists(card.id)",
      }
    }
    return formattedCard
  })
  const itemBatches = splitIntoBatches(allCardsFormatted, 4);
  batchWrite(itemBatches).then(() => console.log("done!"))

  }