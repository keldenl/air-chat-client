import React from 'react';
import "./style.css";

export function User({ data }) {
    const { id, ip, userName } = data;
    return (
        <div>
            <p>{userName}</p>
        </div>
    )
}