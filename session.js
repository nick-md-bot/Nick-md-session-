const axios = require("axios");

const token = "460bc248b88a3d52c22be4bf5b31b8cd772938b1a683ae90639107c7d8f95a2435aca5c0350beb1612ec3d858d82cfb94028ce649242c28c237c1c3599153892";

async function create(data) {
  try {
    const config = {
      method: 'post',
      url: 'https://hastebin.com/documents',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'  
      },
      data: JSON.stringify({ content: data })  
    };

    const response = await axios(config);
    return { id: response.data.key };  
  } catch (error) {
    throw new Error(`Error creating document: ${error.message}`);
  }
}

async function get(key) {
  try {
    const config = {
      method: 'get',
      url: `https://hastebin.com/raw/${key}`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const response = await axios(config);
    return response.data
  } catch (error) {
    throw new Error(`Error getting document: ${error.message}`);
  }
}

module.exports = { create, get };
