import { useState } from 'react';

export const useCounter = (initialValue: number = 0) => {
    const [count, setCount] = useState(initialValue);
    const [history, setHistory] = useState<number[]>([]);

    const increase = () => {
        if (count < 20) {
            const newValue = count + 1;
            setCount(newValue);
            setHistory([...history, newValue]);
        }
    };

    const decrease = () => {
        if (count > 0) {
            const newValue = count - 1;
            setCount(newValue);
            setHistory([...history, newValue]);
        }
    };

    const reset = () => {
        setCount(0);
        setHistory([...history, 0]);
    };

    return {
        count,
        history,
        increase,
        decrease,
        reset,
    };
};