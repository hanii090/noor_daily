import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Returns true if the user has enabled "Reduce Motion" in system accessibility settings.
 * Use this to skip or simplify animations for accessibility compliance.
 */
export function useReducedMotion(): boolean {
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

        const subscription = AccessibilityInfo.addEventListener(
            'reduceMotionChanged',
            setReduceMotion,
        );

        return () => subscription.remove();
    }, []);

    return reduceMotion;
}
