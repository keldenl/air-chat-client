import React, { useEffect, useState, useRef } from 'react';

import './App.css';

function User({ data }) {
  const { id, ip, userName } = data;
  return (
    <li>
      <p>{userName}</p>
    </li>
  )
}

function App() {
  const webSocket = useRef(null);
  const [socketOpen, setSocketOpen] = useState(false);
  const [socketMessages, setSocketMessages] = useState([]);

  // App state
  const [myData, setMyData] = useState({});
  const [users, setUsers] = useState([]);


  const handleConnect = (message) => {
    const { name, ip } = message;
    setSocketOpen(true);
    setMyData({ name, ip });
  }

  const handleLogin = (message) => {
    const { success, users } = message;
    if (!success) {
      window.alert('Failed to login');
      return;
    }
    setUsers(users);
  }

  const handleUpdateUser = (message) => {
    const { user: newUser } = message
    setUsers([...users, newUser])
  }

  useEffect(() => {
    // add the websocket url to env in production environment     
    webSocket.current = new WebSocket("ws://localhost:9000");
    webSocket.current.onmessage = message => {
      const data = JSON.parse(message.data);
      setSocketMessages(prev => [...prev, data]);
    };
    webSocket.current.onclose = () => {
      webSocket.current.close();
    };
    return () => webSocket.current.close();
  }, []);

  useEffect(() => {
    const message = socketMessages.pop();
    console.log(message);

    if (!message) return
    switch (message.type) {
      case "connect":
        handleConnect(message);
        break;
      case "login":
        handleLogin(message);
        break;
      case "updateUsers":
        handleUpdateUser(message);
        break;
      case "leave":
        break;
      default:
        break;
    }
  }, [socketMessages])

  const sendMessage = () => {
    const data = { type: "offer", name: "LightSalmon", offer: "deez" }
    webSocket.current.send(JSON.stringify(data));
  }

  return (
    <div className="App">
      <header className="App-header">Air Chat</header>
      <button onClick={sendMessage}>Send Message</button>
      {socketOpen ? <p>Socket opened</p> : undefined}
      <div>
        <h2>Nearby Devices</h2>
        {users.length > 0 ?
          <ul>
            {users.map(user => <User key={user.id} data={user} />)}

          </ul> :
          <p>No devices nearby</p>
        }
      </div>
      {Object.keys(myData).length > 0 ?
        <div>
          <p>You as known as {myData.name}</p>
          <p>Your IP is {myData.ip}</p>
        </div>
        : undefined}
    </div>
  );
}

export default App;
