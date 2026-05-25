import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../../api/admin';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@lagommasuria.pl');
  const [password, setPassword] = useState('Lagom123!');
  
  const submit = async () => {
    const response = await loginAdmin(email, password);
    localStorage.setItem('adminToken', response.token);
    navigate('/admin');
  };
  
  return (
    <div className='mx-auto max-w-md px-6 py-20'>
      <div className='rounded-2xl bg-white p-8 shadow-sm'>
        <h1 className='text-3xl font-semibold'>Panel administracyjny</h1>
        
        <label className='mt-6 block'>
          Email
          <input
            aria-label='Email'
            className='mt-2 w-full rounded border px-3 py-2'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        
        <label className='mt-4 block'>
          Hasło
          <input
            aria-label='Hasło'
            type='password'
            className='mt-2 w-full rounded border px-3 py-2'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        
        <button type='button' onClick={submit} className='mt-6 rounded bg-pine px-4 py-2 text-white'>
          Zaloguj
        </button>
      </div>
    </div>
  );
}
