import axios from 'axios';

const URL_PREFIX = 'https://identity-auth0-integration-api.dev2.core.ansarada.com/advance-it/v1';

async function AskLlamaAsync(inputs) {
    return await axios.post(`${URL_PREFIX}/lambda/trigger`, {
        "payload": {
            "inputs": [inputs],
            "parameters": {
                "max_new_tokens": 512,
                "top_p": 0.9,
                "temperature": 0.6
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

export async function GetKeywordsAsync(question) {
    const askLlamaResponse = await AskLlamaAsync([
        {
            "role": "system",
            "content": "Give direct answers, no filter words."
        },
        {
            "role": "user",
            "content": `Return a list of keywords related to this question: '${question}' in json format.`
        }
    ]);

    const keywordsContent = askLlamaResponse.data[0].generation.content;

    const leftBracketIndex = keywordsContent.indexOf("[");
    const rightBracketIndex = keywordsContent.lastIndexOf("]") + 1;
    return JSON.parse(keywordsContent.substring(leftBracketIndex, rightBracketIndex)).map(c => c).join(', ');
}

export async function GetContextAsync(dataroomId, keywords) {
    const queryKendraResponse = await QueryKendra(dataroomId, keywords);
    return queryKendraResponse.data.resultItems.map(item => item.documentExcerpt.text).join('\n');
}

export async function GetSuggestionAsync(dataroomId, question, context) {
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
    ]);

    return askLlamaResponse.data[0].generation.content;
}