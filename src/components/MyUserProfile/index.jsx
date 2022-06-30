import React from 'react';
import "./style.css";

export function MyUserProfile({ myData }) {
    const myUserExists = myData != null && Object.keys(myData).length > 0;
    const { name, ip, ipCode } = myData
    return (
        myUserExists ?
            <div className={'appleShadow userProfileContainer'} style={{ backgroundColor: name }}>
                <p>{name}</p>
                <p>Share Code: {ipCode}</p>
                <p>IP: {ip}</p>
            </div>
            : undefined
    )
}