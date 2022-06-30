import React from 'react';
import "./style.css";

export function User({ data, offerTo, setOfferTo }) {
    const { id, ip, userName } = data;

    const onSetOfferTo = () => {
        setOfferTo(userName);
    }

    return (
        <li onClick={onSetOfferTo} className={`appleShadow ${offerTo === userName ? 'user-selected' : ''} user`}
            style={{
                borderColor: data.userName,
                ...(offerTo === userName ? { backgroundColor: data.userName } : {})
            }}
        >
            {/* <div > */}
            <p>{userName}</p>
        </li>
    )
}