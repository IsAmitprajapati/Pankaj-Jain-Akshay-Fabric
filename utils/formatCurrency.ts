export const getFormatCurrency = (result: any) => {
  const formattedResult = isNaN(result)
      ? "₹0.00"
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          minimumFractionDigits: 2,
        }).format(result)
    ;


    console.log(result)
  return formattedResult;
};
