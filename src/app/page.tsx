"use client"

import { useState, useRef, useEffect } from "react";
import styles from "./styles/Home.module.scss";
import io from "socket.io-client";

const socket = io("http://localhost:5001");
// const socket = io("https://realtimechat-server-k8ck.onrender.com")

type MessageType = {
  userName: string;
  text: string;
}

export default function Home() {
  const [userName, setUserName] = useState("") // ユーザー名
  const [typingUserList, setTypingUserList] = useState<string[]>([])
  const [message, setMessage] = useState(""); // メッセージの入力内容
  const [messageList, setMessageList] = useState<MessageType[]>([]); // チャットエリアに表示するメッセージリスト
  const [isTyping, setIsTyping] = useState(false)
  let timer: any = useRef(null) // setTimeout解除用ID

  /**
   * ユーザー名の更新処理
   * 
   * @param e イベントオブジェクト
   */
  const handleInputUserName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(e.target.value)
  }

  /**
   * メッセージの更新処理
   * 
   * @param e イベントオブジェクト
   */
  const handleInputMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isTyping) {
      socket.emit("sendTypingStartUser", userName); // サーバーへ送信
      setIsTyping(true)
    }

    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      socket.emit("sendTypingEndUser", userName); // サーバーへ送信
      setIsTyping(false)
    }, 3000)
    setMessage(e.target.value)
  }

  /**
   * メッセージの送信処理
   */
  const handleSendMessage = () => {
    const sendData: MessageType = { userName: userName, text: message }

    socket.emit("sendMessage", sendData); // サーバーへ送信
    setMessage('')
    clearTimeout(timer.current);
    socket.emit("sendTypingEndUser", userName); // サーバーへ送信
    setIsTyping(false)
  };

  /**
   * サーバーからの入力中ユーザー受信処理
   */
  socket.on("receivedTypingUser", (userList: string[]) => {
    console.log(userList)
    setTypingUserList(userList);
  });

  /**
   * サーバーからのメッセージ受信処理
   */
  socket.on("receivedMessage", (messageData: MessageType) => {
    setMessageList([...messageList, messageData]);
  });

  /**
   * タイピング中のユーザーリストの取得(自分は除外する)
   * 
   * @returns タイピング中のユーザーリスト
   */
  const getTypingUserStr = () => {
    let typingUserStr = ''
    const filterTypingUserList = typingUserList.filter((user) => user !== userName)

    if (filterTypingUserList.length > 0) {
      typingUserStr = filterTypingUserList.join(', ') + ' が入力中です...'
    }

    return typingUserStr
  }

  const getContentClassName = (targetUserName: string) => {
    return targetUserName === userName ? `${styles['my-message']}` : `${styles['other-message']}`
  }

  useEffect(() => {
    let chatArea: HTMLElement | null = document.getElementById('chatArea')

    // チャット送信後は一番下まで自動スクロールさせる
    if (chatArea !== null) {
      const chatAreaHeight = chatArea.scrollHeight;

      chatArea.scrollTop = chatAreaHeight;
    }
  }, [messageList]);

  return (
    <div className={styles.main}>
      <div className={styles.header}>
        <h2>リアルタイムチャットアプリ</h2>
        <div className={styles.inputUserName}>
          <p>ユーザー名</p>
          <input
            type="text"
            onChange={handleInputUserName}
            placeholder="ユーザー名を入力"
            value={userName}
          />
        </div>
      </div>
      <div id="chatArea" className={styles.chatArea}>
        {messageList.map((message: MessageType, index: number) => (
          <div key={index} className={`${styles.message} ${getContentClassName(message.userName)}`}>
            <p className={styles.messageUserName}>
              {message.userName}
            </p>
            <pre className={styles.messageText}>
              {message.text}
            </pre>
          </div>
        ))}
      </div>
      <div className={styles.typingUserArea}>
        {getTypingUserStr()}
      </div>
      <div className={styles.inputArea}>
        <textarea
          onChange={handleInputMessage}
          placeholder="メッセージを入力"
          className={userName.length === 0 ? 'is-disabled' : ''}
          value={message}
        />
        <button
          onClick={handleSendMessage}
          className={userName.length === 0 ? 'is-disabled' : ''}
        >
          送信
        </button>
      </div>
    </div>
  );
}