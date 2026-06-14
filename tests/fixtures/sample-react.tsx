// Sample React component with known quality issues
import React, { useState, useEffect } from 'react';

// ❌ Unused variable
const unusedVar = 'this is never used';

// ❌ any type
function processData(data: any): any {
  return data;
}

// ❌ Long function (demonstrates complexity detection)
function complexFunction(a: number, b: number, c: number, d: number) {
  if (a > 0) {
    if (b > 0) {
      if (c > 0) {
        if (d > 0) {
          for (let i = 0; i < a; i++) {
            for (let j = 0; j < b; j++) {
              // ❌ nested loop
              console.log(i, j);
            }
          }
        } else {
          return -1;
        }
      } else if (c < -10) {
        return -2;
      } else {
        return -3;
      }
    }
  } else if (a < -100) {
    return -4;
  } else {
    return -5;
  }
  return 0;
}

// ❌ Missing key prop in list
const ItemList = ({ items }: { items: string[] }) => (
  <ul>
    {items.map((item) => (
      <li>{item}</li>
    ))}
  </ul>
);

// ❌ Missing alt tag
const Logo = () => <img src="/logo.png" width={200} height={100} />;

// ❌ Non-semantic interactive div
const ClickableDiv = ({ onClick }: { onClick: () => void }) => (
  <div onClick={onClick}>Click me</div>
);

// ❌ useEffect without proper deps
const DataFetcher = ({ userId }: { userId: string }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/user/${userId}`).then((r) => r.json()).then(setData);
  }, []);

  return <div>{JSON.stringify(data)}</div>;
};

export { ItemList, Logo, ClickableDiv, DataFetcher, complexFunction, processData };
