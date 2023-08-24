import axios from 'axios';

const URL_PREFIX = 'https://identity-auth0-integration-api.dev2.core.ansarada.com/advance-it/v1';

async function AskLlamaAsync(inputs, maxNewToken = 512, topP = 0.9, temperature = 0.6) {
    return await axios.post(`${URL_PREFIX}/lambda/trigger`, {
        "payload": {
            "inputs": [inputs],
            "parameters": {
                "max_new_tokens": maxNewToken,
                "top_p": topP,
                "temperature": temperature
            }
        }
    });
}

async function QueryKendra(dataroomId, queryText) {
    return await axios.post(`${URL_PREFIX}/kendra/query`, {
        "queryText": queryText,
        "attributeFilter": {
            "andAllFilters": [
                {
                    "EqualsTo": {
                        "Key": "dataroom_id",
                        "Value": {
                            "LongValue": dataroomId
                        }
                    }
                }
            ]
        }
    });
}

async function RetrieveKendra(dataroomId, queryText, pageSize = 5) {
    return await axios.post(`${URL_PREFIX}/kendra/retrieve`, {
        "queryText": queryText,
        "attributeFilter": {
            "andAllFilters": [
                {
                    "EqualsTo": {
                        "Key": "dataroom_id",
                        "Value": {
                            "LongValue": dataroomId
                        }
                    }
                }
            ]
        },
        "pageSize": pageSize,
        "pageNumber": 1
    });
} 

export async function GetKeywordsAsync(question, maxNewToken = 512, topP = 0.9, temperature = 0.6) {
    const askLlamaResponse = await AskLlamaAsync([
        {
            "role": "system",
            "content": "Give direct answers, no filter words."
        },
        {
            "role": "user",
            "content": `Return a list of keywords related to this question: '${question}' in json format.`
        }
    ], maxNewToken, topP, temperature);

    const keywordsContent = askLlamaResponse.data[0].generation.content;

    const leftBracketIndex = keywordsContent.indexOf("[");
    const rightBracketIndex = keywordsContent.lastIndexOf("]") + 1;
    return JSON.parse(keywordsContent.substring(leftBracketIndex, rightBracketIndex)).map(c => c).join(', ');
}

export async function GetContextAsync(dataroomId, keywords, pageSize = 5) {
    const retrieveKendraResponse = await RetrieveKendra(dataroomId, keywords, pageSize);
    return retrieveKendraResponse.data.resultItems.map(item => item.content).join('\n');
}

export async function GetSuggestionAsync(dataroomId, question, context, maxNewToken = 512, topP = 0.9, temperature = 0.6) {
    const askLlamaResponse = await AskLlamaAsync([
        {
            "role": "user",
            "content": `Hello`
        },
        {
            "role": "assistant",
            "content": `The dataroom ${dataroomId} has the information: ${context}.`
        },
        {
            "role": "user",
            "content": `Based on the provided information, answer this question for the dataroom ${dataroomId}: '${question}'.`
        }
    ], maxNewToken, topP, temperature);

    return askLlamaResponse.data[0].generation.content;
}