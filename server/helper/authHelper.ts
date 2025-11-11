// import bcrypt from 'bcrypt'
//     export const hashPassword = async (password:string) => {
//         try {
//             const salt = await bcrypt.genSalt(10);
//             const hash = await bcrypt.hash(password, salt);
//             console.log('.....the hashed password he : ',hash)
//             return hash;
//         } catch (error) {
//             throw error;
//         }
//     }
//     export const comparePassword = (plain:string,hashed:string)=>{
//         return bcrypt.compare(plain,hashed);
//     }