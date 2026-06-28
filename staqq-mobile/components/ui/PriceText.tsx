import { Text } from 'react-native';

interface Props {
    amount: number | null | undefined;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
};

export default function PriceText({ amount, size = 'md', className = '' }: Props) {
    const formatted = amount != null
        ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '₹  ';

    return (
        <Text className={`text-white font-semibold ${sizeClasses[size]} ${className}`}>
            {formatted}
        </Text>
    );
}
