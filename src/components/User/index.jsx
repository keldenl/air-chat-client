import React from 'react';
import "./style.css";

export function User({ data, offerTo, setOfferTo }) {
    const { id, ip, userName } = data;

    const onSetOfferTo = () => {
        setOfferTo(id);
    }

    return (
        <div onClick={onSetOfferTo} className={`${offerTo === id ? 'user-selected' : ''} user`}>
            <p>{userName}</p>
        </div>
    )
}