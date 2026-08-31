with open('server.ts', 'r') as f:
    content = f.read()

target = """
    // Masked destination
    const maskedEmail = targetUser.email.replace(/(.{2})(.*)(?=@)/, (_g1, g2, g3) => g2 + '*'.repeat(Math.max(g3.length, 3)));
    res.json({
"""

replacement = """
    // Masked destination
    const maskedEmail = targetUser.email.replace(/(.{2})(.*)(?=@)/, (_g1, g2, g3) => g2 + '*'.repeat(Math.max(g3.length, 3)));
    
    let whatsappUrl = null; 
    if(channel === "phone" && targetUser.phone) { 
        const cleanPhone = targetUser.phone.replace(/[^0-9]/g, ""); 
        whatsappUrl = `https://wa.me/${cleanPhone}?text=Your%20Pure%20Max%20OS%20Password%20Reset%20Code%20is%3A%20${otp}`; 
    }
    
    res.json({
      whatsappLink: whatsappUrl,
"""

content = content.replace(target, replacement)

with open('server.ts', 'w') as f:
    f.write(content)
