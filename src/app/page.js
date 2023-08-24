"use client";

import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import "primereact/resources/primereact.min.css";
import "primereact/resources/themes/saga-blue/theme.css";

import {
    MainContainer,
    ChatContainer,
    MessageList,
    Message,
    MessageInput,
    ConversationHeader,
    Avatar,
    TypingIndicator,
    Button
} from '@chatscope/chat-ui-kit-react';

import {useEffect, useState} from 'react';
import {GetContextAsync, GetKeywordsAsync, GetSuggestionAsync} from "@/app/service";
import {AiOutlineClear, AiOutlineSetting} from "react-icons/ai";
import {Dialog} from "primereact/dialog";
import {InputNumber} from "primereact/inputnumber";

export default function Home() {
    const USER_NAME = 'User';
    const ASSISTANT_NAME = 'Assistant';

    const FIRST_MESSAGE = {
        sender: ASSISTANT_NAME,
        direction: "incoming",
        message: 'What is the id of the dataroom you want to analyze?'
    };

    const [messages, setMessages] = useState([FIRST_MESSAGE]);
    const [dataroomId, setDataroomId] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [currentJob, setCurrentJob] = useState('');

    const [showSettings, setShowSettings] = useState(false);
    const [maxNewTokens, setMaxNewTokens] = useState(512);
    const [topP, setTopP] = useState(0.9);
    const [temperature, setTemperature] = useState(0.6);
    const [kendraPageSize, setKendraPageSize] = useState(5);

    async function AskForSuggestionAsync() {
        if (dataroomId === 0 || currentQuestion === '') {
            return;
        }

        try {
            setCurrentJob('Asking llama-2 to provide the list of keywords...');
            const keywords = await GetKeywordsAsync(currentQuestion, maxNewTokens, topP, temperature);
            AddNewAssistantMessage(keywords, 'Related keywords:');

            setCurrentJob('Getting context from Kendra...');
            const context = await GetContextAsync(dataroomId, keywords, kendraPageSize);
            AddNewAssistantMessage(context, 'Aggregated context:');

            setCurrentJob('Asking llama-2 for the suggestion...');
            const suggestion = await GetSuggestionAsync(dataroomId, currentQuestion, context, maxNewTokens, topP, temperature);
            AddNewAssistantMessage(suggestion, 'Final suggestion:');
        } catch (e) {
            console.error(e);
            AddNewAssistantMessage('There was an error while processing your question, please try again...')
        } finally {
            setCurrentJob('');
            setCurrentQuestion('');
        }
    }

    useEffect(() => {
        AskForSuggestionAsync();
    }, [currentQuestion]);

    function AddNewAssistantMessage(message, header) {
        setMessages(current => [...current, {
            sender: ASSISTANT_NAME,
            direction: header ? null : "incoming",
            message: message,
            header: header
        }]);
    }

    function AddNewUserMessage(message) {
        setMessages(current => [...current, {
            sender: USER_NAME,
            direction: "outgoing",
            message: message
        }]);
    }

    function ClearMessages() {
        setMessages([FIRST_MESSAGE]);
        setCurrentJob('');
        setDataroomId(0);
    }

    function HandleNewUserMessageEntered(message) {
        AddNewUserMessage(message);

        // The AI is still asking for the dataroom id.
        if (dataroomId === 0) {
            if (!Number.isInteger(Number(message))) {
                AddNewAssistantMessage("Please provide the correct room id format.");
            } else {
                setDataroomId(Number(message));
                AddNewAssistantMessage("👌");
                AddNewAssistantMessage(`Please enter your question for the dataroom ${Number(message)}.`);
            }
        } else { // The AI is waiting for a new question.
            setCurrentQuestion(message);
        }
    }

    function SettingDialog() {
        return (
            <Dialog header="Settings" visible={showSettings} style={{width: '50vw'}} onHide={() => setShowSettings(false)}>
                <div className="card flex flex-wrap gap-3 p-fluid">
                    <div className="flex-auto">
                        <label htmlFor="integeronly" className="font-bold block mb-2">Max Kendra item</label>
                        <InputNumber inputId="integeronly" value={kendraPageSize} onValueChange={(e) => setKendraPageSize(e.value)} />
                    </div>
                    <br />

                    <div className="flex-auto">
                        <label htmlFor="integeronly" className="font-bold block mb-2">max_new_tokens</label>
                        <InputNumber inputId="integeronly" value={maxNewTokens} onValueChange={(e) => setMaxNewTokens(e.value)} />
                    </div>
                    <br />
                    
                    <div className="flex-auto">
                        <label htmlFor="withoutgrouping" className="font-bold block mb-2">top_p</label>
                        <InputNumber value={topP} onValueChange={(e) => setTopP(e.value)} min={0} max={1}/>
                    </div>
                    <br />

                    <div className="flex-auto">
                        <label htmlFor="minmaxfraction" className="font-bold block mb-2">temperature</label>
                        <InputNumber value={temperature} onValueChange={(e) => setTemperature(e.value)} min={0} max={1} />
                    </div>
                </div>
            </Dialog>
        )
    }

    return (
        <>
            {SettingDialog()}
            <main style={{position: 'relative', height: '98vh', margin: 'auto', width: '50%'}}>
                <MainContainer>
                    <ChatContainer>
                        <ConversationHeader>
                            <Avatar
                                src={'https://media.istockphoto.com/id/1253384179/vector/alpaca-hipster-vintage-vector-icon-illustration.jpg?s=612x612&w=0&k=20&c=4GXo-sqBa_cI3KMARzmQti1Uuj87770F0_JPHz8_vFM='}
                                name={ASSISTANT_NAME}
                            />
                            <ConversationHeader.Content userName={ASSISTANT_NAME} info="llama-2-13b-f"/>
                            <ConversationHeader.Actions>
                                <Button disabled={dataroomId === 0} icon={<AiOutlineClear size={24}/>} onClick={ClearMessages}/>
                                <Button icon={<AiOutlineSetting size={24}/>} onClick={() => setShowSettings(true)}/>
                            </ConversationHeader.Actions>
                        </ConversationHeader>

                        <MessageList typingIndicator={currentJob !== '' && <TypingIndicator content={currentJob}/>}>
                            {messages.map(item => (
                                <Message model={item}>
                                    {item.header && <Message.Header sender={item.header}/>}
                                </Message>
                            ))}
                        </MessageList>
                        <MessageInput
                            placeholder="Aa"
                            attachButton={false}
                            onSend={HandleNewUserMessageEntered}
                        />
                    </ChatContainer>
                </MainContainer>
            </main>
        </>
    )
}
