import React from 'react';
import "./style.css";

export function MyUserProfile({ myData }) {
    const myUserExists = myData != null && Object.keys(myData).length > 0;
    return (
        myUserExists ?
            <div>
                <p>You as known as {myData.name}</p>
                <p>Your IP is {myData.ip}</p>
            </div>
            : undefined
    )
}