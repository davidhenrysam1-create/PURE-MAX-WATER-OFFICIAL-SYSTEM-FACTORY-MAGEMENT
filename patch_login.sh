sed -i 's/setResetMsg(data.message);/setResetMsg(data.message);\n        if (data.whatsappLink) { window.open(data.whatsappLink, "_blank"); }/g' src/components/auth/LoginModal.tsx
