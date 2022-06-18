import React from 'react';
import "./style.css";

export function User({ data, offerTo, setOfferTo }) {
    const { id, ip, userName } = data;

    const onSetOfferTo = () => {
        setOfferTo(userName);
    }

    return (
        <div onClick={onSetOfferTo} className={`${offerTo === userName ? 'user-selected' : ''} user`}>
            <p>{userName}</p>
        </div>
    )
}