import Button from '../../components/Button'
import Header from '../../components/Header'
import Background from '../../components/Background'
import { useRouter } from 'expo-router'


export default function Profile() {
    const router = useRouter()
    return(
        <>
        <Background>
            <Header>
                Profile
            </Header>
        </Background>
        </>
    )
}